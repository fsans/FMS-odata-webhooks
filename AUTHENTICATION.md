# FileMaker OData Authentication Guide

## Understanding FileMaker OData Authentication

### How It Works

FileMaker OData uses **HTTP Basic Authentication** with database-level accounts. This means:

1. Credentials are checked against accounts **inside your FileMaker database file(s)**
2. The same credentials are used for all databases you access through the app
3. Each database can have different accounts, but for convenience, use the same credentials across databases

## For Your Contacts.fmp12 Example

Since you have **Contacts.fmp12** with fmrest/OData already activated:

### Step 1: Verify Your Account in FileMaker Pro

1. Open **Contacts.fmp12** in FileMaker Pro
2. Go to **File > Manage > Security**
3. Check the **Accounts** tab - find your account (or note the username)
4. Click on the account and check its **Privilege Set**
5. Click **Edit** on the Privilege Set
6. Go to **Extended Privileges** tab
7. Verify **"fmrest"** is checked ✓

### Step 2: Connect in the Web App

Enter these details:

- **Server Host**:
  - If FileMaker Server is on your local machine: `localhost`
  - If on network: The IP address or hostname (e.g., `192.168.1.100` or `myserver.local`)
  - **Do not include** `https://` or any path

- **Database Account Username**:
  - The username from Step 1 (the account that exists in Contacts.fmp12)

- **Database Account Password**:
  - The password for that account

### Step 3: Test the Connection

Click **Connect**. The app will:
1. Try to fetch the list of databases from the server
2. If successful, you'll see "Connected to FileMaker Server"
3. You should see your databases (including Contacts) in the Database Browser

## Common Issues & Solutions

### ❌ "Connection failed" or Network Error

**Possible causes:**
- FileMaker Server is not running
- Wrong hostname/IP address
- OData/REST API is disabled in FileMaker Server Admin Console
- Firewall blocking port 443 (HTTPS)

**Solutions:**
1. Check FileMaker Server Admin Console > Database Server Settings
2. Ensure "OData/REST API" is enabled
3. Try `https://YOUR_SERVER/fmi/odata/v4` in your browser to test

### ❌ "401 Unauthorized" Error

**Possible causes:**
- Wrong username or password
- Account doesn't exist in the database
- Account doesn't have fmrest privilege

**Solutions:**
1. Double-check username and password in FileMaker Pro
2. Verify the account has fmrest extended privilege
3. Try the credentials in your browser at `https://YOUR_SERVER/fmi/odata/v4`

### ❌ Can See Databases but Can't Access Metadata/Webhooks

**Possible causes:**
- The account exists in some databases but not others
- The account has fmrest in some databases but not all

**Solutions:**
1. Ensure the same account (username/password) exists in all databases you want to manage
2. Or create a standardized "api_user" account across all your databases

### ⚠️ CORS Errors in Browser Console

**Possible cause:**
- Browser security blocking cross-origin requests

**Solutions:**
1. For development: Consider running the app and FileMaker Server on the same machine
2. For production: Configure CORS headers in FileMaker Server (if supported) or use a proxy

### ⚠️ SSL Certificate Warnings

**Possible cause:**
- FileMaker Server using self-signed SSL certificate

**Solutions:**
1. Accept the certificate warning in your browser
2. Visit `https://YOUR_SERVER/fmi/odata/v4` first and accept the certificate
3. Then try connecting in the app

## Best Practices

### For Development/Testing
- Use your existing database account that has Full Access or Admin privileges
- Ensure fmrest is enabled

### For Production
1. Create a dedicated account for webhook management:
   - Username: `webhook_manager` (or similar)
   - Privilege Set: Custom with:
     - Access to All Records (or specific tables you want to monitor)
     - fmrest extended privilege enabled
     - Ability to run scripts (if using script callbacks)
2. Use the **same account credentials** across all databases on the server
3. Store credentials securely (not in the app - enter them each session)

## Multiple Databases with Different Accounts

If your databases have **different account credentials**, you have two options:

### Option 1: Standardize Accounts (Recommended)
Create the same username/password account in all your databases:
- Makes the app easier to use
- Single sign-on experience
- Can use external authentication (AD, OAuth) for consistency

### Option 2: Request Per-Database Authentication
The app currently uses one set of credentials for all databases. If you need per-database authentication, this would require modifying the app to:
- Ask for credentials when selecting each database
- Store separate credentials per database
- Re-authenticate when switching databases

Would you like this feature? Let us know!

## Testing Your Setup

### Quick Browser Test
1. Open your browser
2. Navigate to: `https://YOUR_SERVER/fmi/odata/v4`
3. Enter your database account credentials when prompted
4. You should see an XML or JSON response listing available databases

If this works, the app should work too!

### Example for Contacts.fmp12
If your account is:
- Username: `admin`
- Password: `password123`
- Server: `localhost`

You should be able to visit:
```
https://localhost/fmi/odata/v4
```

And see something like:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<service xml:base="https://localhost/fmi/odata/v4/">
  <workspace>
    <collection href="Contacts">
      <title>Contacts</title>
    </collection>
  </workspace>
</service>
```

## Need Help?

If you're still having issues:
1. Check FileMaker Server logs
2. Verify OData is enabled in FileMaker Server Admin Console
3. Test the URL in your browser first
4. Check that your account has the correct privileges in FileMaker Pro

The credentials are **database accounts**, not server admin credentials!
