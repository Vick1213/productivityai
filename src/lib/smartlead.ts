// lib/smartlead.ts
/**
 * SmartLeads helper – v3
 *
 *  • Uses plain  ?api_key=…  query-string auth (no headers)
 *  • listClients() → GET /analytics/client/list
 *  • listCampaigns(clientId) →
 *        1. GET /campaign?api_key=xxx&limit=500&page=N  (all pages)
 *        2. Filter where campaign.client_id === +clientId
 *        3. Return [{ id, name }]
 */
const BASE = "https://server.smartlead.ai/api/v1";

export class SmartleadClient {
  constructor(private apiKey: string) {}

  /* ─────────── Clients ─────────── */
  async listClients() {
    const url = `${BASE}/analytics/client/list?api_key=${this.apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`SmartLeads clients → ${res.status}`);
    const json = await res.json();

    const arr =
      json?.data?.client_list ??
      json?.clients ??
      (Array.isArray(json) ? json : []);
    return arr.map((c: any) => ({ id: String(c.id), name: c.name }));
  }

  /* ─────────── Campaigns (all → filter) ─────────── */
  async listCampaigns(clientId: string) {
    const results: any[] = [];

    let page = 1;
    while (true) {
      const url = `${BASE}/campaigns?api_key=${this.apiKey}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`SmartLeads campaigns → ${res.status}`);
      const json = await res.json();

      const pageArr =
        json?.data?.campaign_list ??
        json?.campaigns ??
        (Array.isArray(json) ? json : []);

      results.push(...pageArr);

      const hasNext =
        json?.data?.pagination?.has_next ??
        json?.pagination?.has_next ??
        false;
      if (!hasNext || page >= 20) break; // hard-stop after 10k rows
      page += 1;
    }

    /* filter by client_id sent from caller */
    const filtered = results.filter(
      (c) => String(c.client_id) === String(clientId),
    );

    return filtered.map((c) => ({
      id: String(c.id ?? c.campaign_id),
      name: c.name,
    }));
  }
}
