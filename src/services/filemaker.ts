
import type {
  FileMakerConnection,
  Database,
  TableMetadata,
  Webhook,
  WebhookCreateParams,
  FieldMetadata,
} from '@/types/filemaker'

class FileMakerService {
  private connection: FileMakerConnection | null = null
  private backendUrl = 'http://localhost:3000/api/filemaker'

  setConnection(connection: FileMakerConnection) {
    this.connection = connection
  }

  getConnection(): FileMakerConnection | null {
    return this.connection
  }

  private getAuthHeader(): string {
    if (!this.connection) {
      throw new Error('No connection configured')
    }
    return 'Basic ' + btoa(`${this.connection.username}:${this.connection.password}`)
  }

  private getBaseUrl(database?: string): string {
    if (!this.connection) {
      throw new Error('No connection configured')
    }
    const baseUrl = `https://${this.connection.host}/fmi/odata/v4`
    return database ? `${baseUrl}/${database}` : baseUrl
  }

  private getBackendUrl(path: string): string {
    if (!this.connection) {
      throw new Error('No connection configured')
    }
    // Convert FileMaker URL to backend API path
    // e.g., https://192.168.0.24/fmi/odata/v4 -> /api/filemaker/fmi/odata/v4?host=192.168.0.24
    const url = new URL(path)
    const separator = url.search ? '&' : '?'
    return `${this.backendUrl}${url.pathname}${url.search}${separator}host=${this.connection.host}`
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.getDatabases()
      return true
    } catch (error) {
      console.error('Connection test failed:', error)
      throw error
    }
  }

  async getDatabases(): Promise<Database[]> {
    try {
      const url = this.getBaseUrl()
      const backendUrl = this.getBackendUrl(url)
      console.log('Fetching databases from:', url)
      console.log('Via backend:', backendUrl)

      const response = await fetch(backendUrl, {
        headers: {
          'Authorization': this.getAuthHeader(),
        },
      })

      console.log('Response status:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Error response:', errorText)

        if (response.status === 401) {
          throw new Error('Authentication failed. Check your username and password.')
        } else if (response.status === 404) {
          throw new Error('OData API not found. Ensure FileMaker Server 22.0.4+ with OData enabled.')
        } else if (response.status === 0) {
          throw new Error('Network error. Check server host and CORS settings.')
        }

        throw new Error(`Failed to fetch databases: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data.value || []
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(
          `Cannot reach server at ${this.connection?.host}. This may be due to:\n` +
          `1. SSL Certificate Error: Visit https://${this.connection?.host}/fmi/odata/v4 in your browser and accept the certificate warning\n` +
          `2. Server not running or wrong hostname\n` +
          `3. CORS restrictions\n\n` +
          `Error details: ${error.message}`
        )
      }
      throw error
    }
  }

  async getMetadata(database: string): Promise<TableMetadata[]> {
    const url = `${this.getBaseUrl(database)}/$metadata`
    const backendUrl = this.getBackendUrl(url)
    const response = await fetch(backendUrl, {
      headers: {
        'Authorization': this.getAuthHeader(),
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`)
    }

    const xmlText = await response.text()
    return this.parseMetadataXml(xmlText)
  }

  private parseMetadataXml(xmlText: string): TableMetadata[] {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml')
    const tables: TableMetadata[] = []

    const entityTypes = xmlDoc.querySelectorAll('EntityType')

    entityTypes.forEach((entityType) => {
      let tableName = entityType.getAttribute('Name')
      if (!tableName) return

      // Remove any trailing underscores and trim whitespace
      tableName = tableName.trim().replace(/_+$/, '')
      if (!tableName) return

      const fields: FieldMetadata[] = []
      const properties = entityType.querySelectorAll('Property')

      properties.forEach((prop) => {
        let fieldName = prop.getAttribute('Name')
        const fieldType = prop.getAttribute('Type')

        if (!fieldName || !fieldType) return

        // Clean field name too
        fieldName = fieldName.trim().replace(/_+$/, '')

        fields.push({
          name: fieldName,
          type: fieldType,
          fieldId: prop.getAttributeNS('http://www.filemaker.com/fmpdsoresult', 'FieldID') || undefined,
          tableId: prop.getAttributeNS('http://www.filemaker.com/fmpdsoresult', 'TableID') || undefined,
          autoGenerated: prop.getAttributeNS('http://www.filemaker.com/fmpdsoresult', 'AutoGenerated') === 'true',
          global: prop.getAttributeNS('http://www.filemaker.com/fmpdsoresult', 'Global') === 'true',
          calculation: prop.getAttributeNS('http://www.filemaker.com/fmpdsoresult', 'Calculation') === 'true',
        })
      })

      tables.push({
        name: tableName,
        fields,
      })
    })

    return tables
  }

  async getAllWebhooks(database: string): Promise<Webhook[]> {
    const url = `${this.getBaseUrl(database)}/Webhook.GetAll`
    const backendUrl = this.getBackendUrl(url)
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': this.getAuthHeader(),
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch webhooks: ${response.statusText}`)
    }

    const data = await response.json()
    // Transform FileMaker's webhookID to id
    return (data.webhooks || []).map((wh: any) => ({
      ...wh,
      id: String(wh.webhookID),
    }))
  }

  async createWebhook(database: string, params: WebhookCreateParams): Promise<Webhook> {
    const url = `${this.getBaseUrl(database)}/Webhook.Add`
    const backendUrl = this.getBackendUrl(url)
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params) || undefined,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to create webhook: ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    return data
  }

  async updateWebhook(database: string, webhookId: string, params: WebhookCreateParams): Promise<Webhook> {
    // FileMaker OData only supports: Add, Delete, Get, GetAll, Invoke
    // No native update operation exists, so we must delete and recreate
    // NOTE: This changes the webhook ID - FileMaker generates new sequential IDs
    // This means any external system referencing the old ID will break
    await this.deleteWebhook(database, webhookId)
    return this.createWebhook(database, params)
  }

  async deleteWebhook(database: string, webhookId: string): Promise<void> {
    const url = `${this.getBaseUrl(database)}/Webhook.Delete(${webhookId})`
    const backendUrl = this.getBackendUrl(url)
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })

    if (!response.ok) {
      throw new Error(`Failed to delete webhook: ${response.statusText}`)
    }
  }

  async invokeWebhook(database: string, webhookId: string, tableName?: string): Promise<void> {
    let rowIds: number[] = []

    // If tableName is provided, fetch sample record IDs from that table
    if (tableName) {
      try {
        const baseUrl = `${this.getBaseUrl(database)}/${tableName}`
        const queryString = `$select="id"&$top=5`
        const fullUrl = `${baseUrl}?${queryString}`
        const backendUrl = this.getBackendUrl(fullUrl)
        console.log('Fetching record IDs from:', backendUrl)
        const response = await fetch(backendUrl, {
          headers: {
            'Authorization': this.getAuthHeader(),
          },
        })

        if (response.ok) {
          const data = await response.json()
          console.log('Fetched data:', data)
          // Extract record IDs from the response
          if (data.value && Array.isArray(data.value)) {
            rowIds = data.value.map((record: any) => record.id).filter((id: any) => id !== undefined)
            console.log('Extracted row IDs:', rowIds)
          } else {
            console.warn('No records found in response or invalid format')
          }
        } else {
          const errorText = await response.text()
          console.warn(`Failed to fetch record IDs, status: ${response.status}, error: ${errorText}`)
        }
      } catch (err) {
        console.warn('Failed to fetch record IDs, using default:', err)
      }
    }

    // If we couldn't fetch any IDs, use a default
    if (rowIds.length === 0) {
      console.log('No row IDs found, using default [1]')
      rowIds = [1]
    }

    const url = `${this.getBaseUrl(database)}/Webhook.Invoke(${webhookId})`
    const backendUrl = this.getBackendUrl(url)
    const bodyPayload = { rowIDs: rowIds }
    const bodyString = JSON.stringify(bodyPayload)
    console.log('Invoking webhook with body:', bodyString)
    console.log('Backend URL:', backendUrl)
    console.log('Row IDs to invoke:', rowIds)
    
    const fetchOptions = {
      method: 'POST',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: bodyString,
    }
    console.log('Fetch options:', fetchOptions)
    
    const response = await fetch(backendUrl, fetchOptions)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to invoke webhook: ${response.statusText} - ${errorText}`)
    }
  }

  async executeScript(database: string, scriptName: string, parameter?: string | number | object): Promise<any> {
    const url = `${this.getBaseUrl(database)}/Script.${scriptName}`
    const backendUrl = this.getBackendUrl(url)
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scriptParameterValue: parameter,
      }) || undefined,
    })

    if (!response.ok) {
      throw new Error(`Failed to execute script: ${response.statusText}`)
    }

    return await response.json()
  }
}

export const fileMakerService = new FileMakerService()
