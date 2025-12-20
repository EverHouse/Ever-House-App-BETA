import { Client } from '@hubspot/api-client';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=hubspot',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('HubSpot not connected');
  }
  return accessToken;
}

export async function getUncachableHubSpotClient() {
  const accessToken = await getAccessToken();
  return new Client({ accessToken });
}

export async function getContacts(limit = 10) {
  try {
    const client = await getUncachableHubSpotClient();
    const response = await client.crm.contacts.basicApi.getPage(limit);
    return response.results;
  } catch (error: any) {
    console.error('Failed to fetch HubSpot contacts:', error.message);
    throw error;
  }
}

export async function createContact(properties: { email: string; firstname?: string; lastname?: string; phone?: string }) {
  const client = await getUncachableHubSpotClient();
  const response = await client.crm.contacts.basicApi.create({ properties });
  return response;
}

export async function getContactById(contactId: string) {
  const client = await getUncachableHubSpotClient();
  const response = await client.crm.contacts.basicApi.getById(contactId);
  return response;
}

export async function updateContact(contactId: string, properties: { email?: string; firstname?: string; lastname?: string; phone?: string }) {
  const client = await getUncachableHubSpotClient();
  const response = await client.crm.contacts.basicApi.update(contactId, { properties });
  return response;
}

export async function deleteContact(contactId: string) {
  const client = await getUncachableHubSpotClient();
  await client.crm.contacts.basicApi.archive(contactId);
  return { success: true };
}

export async function getDeals(limit = 10) {
  try {
    const client = await getUncachableHubSpotClient();
    const response = await client.crm.deals.basicApi.getPage(limit);
    return response.results;
  } catch (error: any) {
    console.error('Failed to fetch HubSpot deals:', error.message);
    throw error;
  }
}

export async function getCompanies(limit = 10) {
  try {
    const client = await getUncachableHubSpotClient();
    const response = await client.crm.companies.basicApi.getPage(limit);
    return response.results;
  } catch (error: any) {
    console.error('Failed to fetch HubSpot companies:', error.message);
    throw error;
  }
}
