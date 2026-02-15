# Webhook Editing & Deletion Fix - Soft Delete Approach

## Problem
When editing or deleting webhooks, the FileMaker OData API doesn't support PATCH/PUT operations, and the UI had timing issues:

**Editing Issues:**
- Empty slot appeared briefly after editing (timing issue)
- Both old (deleted) and new webhooks appeared until page refresh
- ID confusion between deleted and new webhooks

**Deletion Issues:**
- List didn't update until manual refresh
- Poor user experience with delayed feedback

## Solution Implemented: Soft Delete + Immediate UI Updates

### 1. Updated Webhook Type
**File:** `src/types/filemaker.ts`
- Added `deleted?: boolean` flag to Webhook interface
- Allows marking webhooks as deleted without removing them from UI

```typescript
export interface Webhook {
  id: string
  webhook: string
  headers?: Record<string, string>
  tableName: string
  notifySchemaChanges: boolean
  select?: string
  filter?: string
  deleted?: boolean // Flag to mark webhooks as deleted (soft delete)
}
```

### 2. Updated `updateWebhook` Method
**File:** `src/services/filemaker.ts`
- Returns both new webhook and old ID: `{ webhook: Webhook; oldId: string }`
- Maintains simple delete+create operation

```typescript
async updateWebhook(database: string, webhookId: string, params: WebhookCreateParams): Promise<{ webhook: Webhook; oldId: string }> {
  const oldId = webhookId
  await this.deleteWebhook(database, webhookId)
  const newWebhook = await this.createWebhook(database, params)
  return { webhook: newWebhook, oldId }
}
```

### 3. Soft Delete UI Logic (Editing)
**Files:** `src/components/WebhookManager.tsx` and `src/components/TabsPanel.tsx`

**Approach:** When updating a webhook:
- Mark old webhook as deleted (`deleted: true`)
- Add new webhook to the list
- Keep deleted webhooks visible but disabled

```typescript
const handleDialogClose = (success: boolean, updateInfo?: { webhook: Webhook; oldId: string }) => {
  if (success && updateInfo) {
    setWebhooks(prev => {
      const oldWebhook = prev.find(w => w.id === updateInfo.oldId)
      const otherWebhooks = prev.filter(w => w.id !== updateInfo.oldId)
      
      if (oldWebhook) {
        return [
          ...otherWebhooks,
          { ...oldWebhook, deleted: true }, // Mark old as deleted
          updateInfo.webhook // Add new webhook
        ]
      }
      
      return [...otherWebhooks, updateInfo.webhook]
    })
  }
}
```

### 4. Immediate Delete UI Updates
**Files:** `src/components/WebhookManager.tsx` and `src/components/TabsPanel.tsx`

**Approach:** When deleting a webhook:
- Remove from local state immediately
- Delete from server in background
- Restore if deletion fails

```typescript
const handleDelete = async (webhookId: string) => {
  if (!confirm('Are you sure you want to delete this webhook?')) return

  try {
    // Remove from local state immediately for better UX
    setWebhooks(prev => prev.filter(w => w.id !== webhookId))
    
    // Then delete from server
    await fileMakerService.deleteWebhook(database.name, webhookId)
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to delete webhook')
    // If deletion failed, reload the webhooks to restore the deleted item
    loadWebhooks()
  }
}
```

### 5. Visual Deleted State
**UI Changes:**
- **Deleted webhooks** show with:
  - Red border and background (`border-red-200 bg-red-50`)
  - Reduced opacity (`opacity-60`)
  - Strikethrough text (`line-through`)
  - "Deleted" badge
  - All buttons disabled (Test, Edit, Delete)

- **Active webhooks** show normally with hover effects

## Benefits

### ✅ **Fixed Issues**
- No more empty slots after editing
- Immediate UI updates when deleting
- Clear visual indication of deleted webhooks
- No timing-related UI inconsistencies
- Predictable behavior every time

### ✅ **User Experience**
- **Editing**: Deleted webhooks remain visible until page refresh
- **Deletion**: Webhooks disappear immediately from list
- Clear visual distinction between active and deleted webhooks
- Disabled buttons prevent confusion
- No sudden disappearing webhooks (except when explicitly deleted)

### ✅ **Technical Benefits**
- No timing dependencies
- Immediate UI feedback for better UX
- Simple, reliable state management
- No race conditions
- Easy to understand and maintain

## How It Works

### Editing Webhooks:
1. **Edit Webhook**: Delete old → Create new → Mark old as deleted in UI
2. **Visual State**: Deleted webhooks appear with red styling and disabled controls
3. **User Action**: User can see both old (deleted) and new webhooks
4. **Refresh**: Page reload clears deleted webhooks (fresh server state)

### Deleting Webhooks:
1. **Delete Request**: Show confirmation dialog
2. **Immediate UI**: Remove webhook from list instantly
3. **Server Delete**: Delete from FileMaker server
4. **Error Handling**: Restore webhook if deletion fails

## Testing

### Editing Test:
1. Create a webhook
2. Edit the webhook (change URL, fields, etc.)
3. Verify:
   - Old webhook shows as "Deleted" with red styling
   - New webhook appears normally
   - Deleted webhook has disabled buttons
   - No empty slots or timing issues
   - Page refresh shows only the new webhook

### Deletion Test:
1. Create a webhook
2. Click delete button
3. Confirm deletion in dialog
4. Verify:
   - Webhook disappears immediately from list
   - No need for manual refresh
   - Error handling restores webhook if deletion fails

## Technical Notes

- **FileMaker Limitation**: OData API doesn't support PATCH/PUT for webhooks
- **Soft Delete**: Keeps deleted items in UI until refresh for better UX (editing only)
- **Immediate Updates**: Local state changes provide instant feedback
- **State Management**: Local state handles delete/create without timing issues
- **Visual Design**: Clear distinction between active and deleted webhooks
