export interface EscrowMetadata {
  escrow_address: string;
  milestone_index: number;
  reqs_cid: string;
  devs_cid?: string | null;
  client_statement?: string | null;
  freelancer_statement?: string | null;
}

/**
 * Inserts the initial milestone requirements metadata into Supabase.
 */
export async function insertEscrowMetadata(
  supabaseUrl: string,
  supabaseKey: string,
  record: EscrowMetadata
): Promise<void> {
  const url = `${supabaseUrl}/rest/v1/escrow_metadata`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "apikey": supabaseKey,
      "Authorization": `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates" // Upsert behavior if it already exists
    },
    body: JSON.stringify({
      escrow_address: record.escrow_address.toLowerCase(),
      milestone_index: record.milestone_index,
      reqs_cid: record.reqs_cid,
      client_statement: record.client_statement || "None provided.",
      freelancer_statement: record.freelancer_statement || "None provided."
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to insert metadata in Supabase: ${response.statusText} - ${errorText}`);
  }
}

/**
 * Updates the deliverable CID for a specific milestone.
 */
export async function updateEscrowDeliverable(
  supabaseUrl: string,
  supabaseKey: string,
  escrowAddress: string,
  milestoneIndex: number,
  devsCid: string
): Promise<void> {
  const url = `${supabaseUrl}/rest/v1/escrow_metadata?escrow_address=eq.${escrowAddress.toLowerCase()}&milestone_index=eq.${milestoneIndex}`;
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "apikey": supabaseKey,
      "Authorization": `Bearer ${supabaseKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      devs_cid: devsCid
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update deliverable CID in Supabase: ${response.statusText} - ${errorText}`);
  }
}

/**
 * Updates the client or freelancer statement for a milestone (e.g. during a dispute).
 */
export async function updateEscrowStatement(
  supabaseUrl: string,
  supabaseKey: string,
  escrowAddress: string,
  milestoneIndex: number,
  role: "client" | "freelancer",
  statement: string
): Promise<void> {
  const url = `${supabaseUrl}/rest/v1/escrow_metadata?escrow_address=eq.${escrowAddress.toLowerCase()}&milestone_index=eq.${milestoneIndex}`;
  const payload = role === "client" 
    ? { client_statement: statement }
    : { freelancer_statement: statement };

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "apikey": supabaseKey,
      "Authorization": `Bearer ${supabaseKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update statement in Supabase: ${response.statusText} - ${errorText}`);
  }
}

/**
 * Retrieves a single escrow milestone metadata record from Supabase.
 */
export async function getEscrowMetadata(
  supabaseUrl: string,
  supabaseKey: string,
  escrowAddress: string,
  milestoneIndex: number
): Promise<EscrowMetadata | null> {
  const url = `${supabaseUrl}/rest/v1/escrow_metadata?escrow_address=eq.${escrowAddress.toLowerCase()}&milestone_index=eq.${milestoneIndex}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "apikey": supabaseKey,
      "Authorization": `Bearer ${supabaseKey}`,
      "Accept": "application/vnd.pgrst.object+json" // Return as single object instead of array
    }
  });

  if (response.status === 406 || response.status === 404) {
    // 406 Not Acceptable is returned by postgrest if no rows match the single object header
    return null;
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch metadata from Supabase: ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

export interface PendingSync {
  id: string;
  type: "INSERT" | "UPDATE" | "STATEMENT";
  escrowAddress: string;
  milestoneIndex: number;
  data: any;
}

const STORAGE_KEY = "noxescrow_pending_metadata_sync";

/**
 * Saves a pending metadata synchronization record to localStorage.
 */
export function savePendingSync(sync: PendingSync): void {
  try {
    const current = getPendingSyncs();
    current.push(sync);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (err) {
    console.error("Failed to write pending sync to localStorage:", err);
  }
}

/**
 * Retrieves all pending metadata synchronization records from localStorage.
 */
export function getPendingSyncs(): PendingSync[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Failed to read pending syncs from localStorage:", err);
    return [];
  }
}

/**
 * Removes a completed synchronization record from localStorage.
 */
export function removePendingSync(id: string): void {
  try {
    const current = getPendingSyncs();
    const updated = current.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to remove pending sync from localStorage:", err);
  }
}
