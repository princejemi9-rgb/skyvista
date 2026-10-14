"use client";
import { useEffect, useState } from "react";
import { money } from "@/lib/flights";
import type { Booking, Transaction } from "@/lib/booking-types";
import type { Destination, Offer, Settings } from "@/lib/content";
import type { InventoryRule } from "@/lib/flights";
type Profile = {
  id: string;
  full_name: string;
  phone: string;
  role: string;
  created_at: string;
};
type Data = {
  profiles: Profile[];
  bookings: Booking[];
  transactions: Transaction[];
  inventory: InventoryRule[];
  destinations: Destination[];
  offers: Offer[];
  settings: { id: string; value: Settings }[];
  payment_methods:{id:"paystack"|"bank_transfer"|"bitcoin";display_name:string;enabled:boolean;instructions:string;display_order:number;updated_at:string}[];
  bank_accounts:{id:string;bank_name:string;account_name:string;account_number:string;currency:string;routing_information:string;instructions:string;enabled:boolean;display_order:number}[];
  crypto_payment_settings:{id:"bitcoin";display_name:string;wallet_address:string;network:string;instructions:string}[];
  bitcoin_wallets:{id:string;display_name:string;wallet_address:string;network:string;instructions:string;qr_path:string|null;enabled:boolean;display_order:number}[];
  payments:{id:string;booking_id:string;method_id:string;amount:number;currency:string;status:string;customer_reference:string;created_at:string;verification_note:string|null}[];
  admin_audit_logs:{id:string;action:string;entity_type:string;entity_id:string;created_at:string;detail:Record<string,unknown>}[];
};
const tabs = [
  "Overview",
  "Customers",
  "Bookings",
  "Payments",
  "Flight inventory",
  "Destinations",
  "Offers",
  "Payment Settings",
  "Website Settings",
  "Admin Users / Security",
];
export function AdminDashboard() {
  const [data, setData] = useState<Data | null>(null),
    [tab, setTab] = useState("Overview"),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [query, setQuery] = useState("");
  async function load() {
    const r = await fetch("/api/admin");
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    setData(d);
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  async function save(table: string, record: unknown) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table, record }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      await load();
      setMessage("Changes saved.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(table:"bank_accounts"|"bitcoin_wallets",id:string){if(!window.confirm("Remove this payment setting?"))return;setBusy(true);setError("");try{const r=await fetch("/api/admin",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({table,id})});const d=await r.json();if(!r.ok)throw new Error(d.error);await load();setMessage("Payment setting removed.");}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function reviewPayment(id:string,action:"approve"|"reject"|"request_information") { const note=window.prompt(action === "approve" ? "Confirm approval note:" : "Enter a note for the customer:"); if (!note) return; if ((action === "approve" || action === "reject") && !window.confirm(`Are you sure you want to ${action} this payment?`)) return; setBusy(true); try { const r=await fetch(`/api/admin/payments/${id}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,note})}); const d=await r.json(); if(!r.ok) throw new Error(d.error); await load(); setMessage("Payment review saved."); } catch(e){setError((e as Error).message);} finally{setBusy(false);} }
  if (!data)
    return (
      <div className="container page-shell">
        <h1>SkyVista administration</h1>
        {error ? (
          <>
            <p className="form-error">{error}</p>
            <button
              className="btn"
              onClick={() => load().catch((e) => setError(e.message))}
            >
              Retry
            </button>
          </>
        ) : (
          <div className="loading-orbit" />
        )}
      </div>
    );
  const matches = (value: unknown) =>
    JSON.stringify(value).toLowerCase().includes(query.toLowerCase());
  return (
    <div className="container page-shell">
      <p className="eyebrow blue">SKYVISTA ADMINISTRATION</p>
      <h1>Your operations, at a glance.</h1>
      <p className="muted">
        Simulated inventory and Paystack test records only. Live payments are
        disabled.
      </p>
      <div className="admin-tabs">
        {tabs.map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => {
              setTab(t);
              setQuery("");
              setMessage("");
            }}
          >
            {t}
          </button>
        ))}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="success-message" role="status">
          {message}
        </p>
      )}
      {tab === "Overview" && (
        <>
          <div className="stats">
            {[
              ["Customers", data.profiles.length],
              ["Bookings", data.bookings.length],
              [
                "Verified test bookings",
                data.bookings.filter((b) => b.status === "test_confirmed")
                  .length,
              ],
              [
                "Test transaction value",
                money(
                  data.transactions
                    .filter((t) => t.status === "success")
                    .reduce((n, t) => n + t.amount, 0),
                ),
              ],
            ].map(([label, value]) => (
              <div className="panel" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className="panel">
            <h2>Operational status</h2>
            <p>Inventory provider: deterministic simulation</p>
            <p>Payments: Paystack test mode</p>
            <p>Fulfilment: no airline reservations or ticket issuance</p>
            <p className="muted">
              This dashboard shows up to 1,000 records per category.
            </p>
          </div>
        </>
      )}
      {["Customers", "Bookings", "Payments"].includes(tab) && (
        <label className="field">
          Search records
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, reference, route or status"
          />
        </label>
      )}
      {tab === "Customers" && (
        <div className="panel">
          {data.profiles.filter(matches).map((p) => (
            <form
              className="row"
              key={p.id}
              style={{ padding: "15px 0", borderBottom: "1px solid #edf1f5" }}
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                save("profiles", {
                  id: p.id,
                  full_name: f.get("name"),
                  phone: f.get("phone"),
                });
              }}
            >
              <label className="field" style={{ flex: 1, margin: 0 }}>
                Name
                <input
                  name="name"
                  defaultValue={p.full_name}
                  minLength={2}
                  maxLength={100}
                  required
                />
              </label>
              <label className="field" style={{ flex: 1, margin: 0 }}>
                Phone
                <input name="phone" defaultValue={p.phone} maxLength={25} />
              </label>
              <span className="badge">{p.role}</span>
              <button className="btn btn-small" disabled={busy}>
                Save customer
              </button>
            </form>
          ))}
          {!data.profiles.length && <p>No customer accounts yet.</p>}
        </div>
      )}
      {tab === "Bookings" && (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Route</th>
                <th>Contact</th>
                <th>Total</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.bookings.filter(matches).map((b) => (
                <tr key={b.id}>
                  <td>{b.reference}</td>
                  <td>
                    {b.flights.map((f) => `${f.from} → ${f.to}`).join(", ")}
                  </td>
                  <td>{b.email}</td>
                  <td>{money(b.total)}</td>
                  <td>{b.status}</td>
                  <td>
                    {b.status === "pending" &&
                    !data.transactions.some((t) => t.booking_id === b.id) ? (
                      <button
                        disabled={busy}
                        className="text-button"
                        onClick={() => save("bookings", { id: b.id })}
                      >
                        Cancel unpaid booking
                      </button>
                    ) : (
                      <span className="muted">
                        {b.status === "pending"
                          ? "Checkout already started"
                          : "No action needed"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.bookings.length && <p>No bookings yet.</p>}
        </div>
      )}
      {tab === "Payments" && (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Mode</th>
                <th>Verified</th>
                <th>Review</th>
              </tr>
            </thead>
            <tbody>
              {[...data.transactions.map(t=>({...t,method_id:"paystack",customer_reference:t.reference})),...data.payments].filter(matches).map((t) => (
                <tr key={t.id}>
                  <td>{"reference" in t?t.reference:t.customer_reference}</td>
                  <td>{money(t.amount)}</td>
                  <td>{t.status}</td>
                  <td>{t.method_id}</td>
                  <td>
                    {"verified_at" in t&&t.verified_at
                      ? new Date(t.verified_at).toLocaleString()
                      : "—"}
                  </td>
                  <td>{"method_id" in t && t.status === "awaiting_verification" ? <span className="row"><button className="text-button" disabled={busy} onClick={()=>reviewPayment(t.id,"approve")}>Approve</button><button className="text-button" disabled={busy} onClick={()=>reviewPayment(t.id,"reject")}>Reject</button><button className="text-button" disabled={busy} onClick={()=>reviewPayment(t.id,"request_information")}>Request info</button></span> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.transactions.length && <p>No test transactions yet.</p>}
        </div>
      )}
      {tab === "Payment Settings" && <><div className="panel"><h2>Payment methods overview</h2><p className="muted">Paystack uses server-only test credentials. Enabling a method makes it visible at checkout; it never creates a real airline reservation.</p>{data.payment_methods.map(m=><form className="panel" key={m.id} onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);save("payment_methods",{id:m.id,display_name:f.get("name"),instructions:f.get("instructions"),display_order:Number(f.get("order")),enabled:f.get("enabled")==="on"});}}><h3>{m.display_name}</h3><div className="form-grid"><label className="field">Display name<input name="name" defaultValue={m.display_name}/></label><label className="field">Display order<input name="order" type="number" defaultValue={m.display_order}/></label><label className="field wide">Customer instructions<textarea name="instructions" defaultValue={m.instructions}/></label></div><label><input name="enabled" type="checkbox" defaultChecked={m.enabled}/> Enabled for test checkout</label><button className="btn btn-small" disabled={busy}>Save payment method</button></form>)}</div><div className="panel"><h2>Bank account management</h2>{data.bank_accounts.map(a=><BankForm key={a.id} account={a} busy={busy} save={save} remove={remove}/>) }<BankForm busy={busy} save={save} remove={remove}/></div><div className="panel"><h2>Bitcoin wallet configuration</h2><p className="muted">Use test information only. QR codes are generated and kept in private storage.</p>{data.bitcoin_wallets.map(w=><WalletForm key={w.id} wallet={w} busy={busy} save={save} remove={remove}/>) }<WalletForm busy={busy} save={save} remove={remove}/></div><div className="panel"><h2>Payment activity and audit logs</h2><p><strong>{data.payments.filter(p=>p.status==="awaiting_verification").length}</strong> manual payment(s) awaiting verification.</p>{data.admin_audit_logs.slice(0,10).map(log=><p className="muted" key={log.id}>{new Date(log.created_at).toLocaleString()} · {log.action} · {log.entity_type}</p>)}</div></>}
      {tab === "Flight inventory" && (
        <div className="panel">
          <h2>Simulated airline schedules</h2>
          <p className="muted">
            Controls affect new searches and server-side quotes. Saved bookings
            keep their original price.
          </p>
          {data.inventory.map((r) => (
            <form
              className="row"
              style={{ padding: "18px 0", borderBottom: "1px solid #edf1f5" }}
              key={r.id}
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                save("inventory", {
                  ...r,
                  multiplier: Number(f.get("multiplier")),
                  active: f.get("active") === "on",
                });
              }}
            >
              <strong style={{ minWidth: 70 }}>{r.airline}</strong>
              <label className="field" style={{ margin: 0 }}>
                Fare multiplier
                <input
                  type="number"
                  name="multiplier"
                  defaultValue={r.multiplier}
                  min="0.5"
                  max="3"
                  step="0.05"
                  required
                />
              </label>
              <label>
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={r.active}
                />{" "}
                Available in search
              </label>
              <button className="btn btn-small" disabled={busy}>
                Save schedule
              </button>
            </form>
          ))}
        </div>
      )}
      {tab === "Destinations" && (
        <>
          <p className="muted">
            Update destination cards or add one using an existing airport and
            image.
          </p>
          {[
            ...data.destinations,
            {
              id: "",
              city: "",
              country: "",
              airport: "LOS",
              image: "/images/london.jpg",
              active: true,
            },
          ].map((d, i) => (
            <form
              className="panel"
              key={`${d.id}-${i}`}
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                save("destinations", {
                  id: f.get("id"),
                  city: f.get("city"),
                  country: f.get("country"),
                  airport: f.get("airport"),
                  image: f.get("image"),
                  active: f.get("active") === "on",
                });
              }}
            >
              <h2>{d.city || "Add destination"}</h2>
              <div className="form-grid">
                {[
                  ["id", "ID"],
                  ["city", "City"],
                  ["country", "Country"],
                  ["airport", "Airport IATA code"],
                ].map(([key, label]) => (
                  <label className="field" key={key}>
                    {label}
                    <input
                      name={key}
                      required
                      defaultValue={String(d[key as keyof Destination])}
                      readOnly={key === "id" && Boolean(d.id)}
                    />
                  </label>
                ))}
                <label className="field">
                  Photo
                  <select name="image" defaultValue={d.image}>
                    {["new-york", "london", "dubai", "paris", "istanbul"].map(
                      (n) => (
                        <option key={n} value={`/images/${n}.jpg`}>
                          {n}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label className="row">
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked={d.active}
                  />{" "}
                  Show on website
                </label>
              </div>
              <button className="btn btn-small" disabled={busy}>
                {d.id ? "Save destination" : "Add destination"}
              </button>
            </form>
          ))}
        </>
      )}
      {tab === "Offers" &&
        [
          ...data.offers,
          { id: "", title: "", code: "", discount: 10, active: true },
        ].map((o, i) => (
          <form
            className="panel"
            key={`${o.id}-${i}`}
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              save("offers", {
                id: f.get("id"),
                title: f.get("title"),
                code: f.get("code"),
                discount: Number(f.get("discount")),
                active: f.get("active") === "on",
              });
            }}
          >
            <h2>{o.title || "Add offer"}</h2>
            <div className="form-grid">
              {[
                ["id", "ID"],
                ["title", "Title"],
                ["code", "Offer code"],
                ["discount", "Discount (%)"],
              ].map(([key, label]) => (
                <label className="field" key={key}>
                  {label}
                  <input
                    name={key}
                    defaultValue={String(o[key as keyof Offer])}
                    required
                    readOnly={key === "id" && Boolean(o.id)}
                    type={key === "discount" ? "number" : "text"}
                    min={1}
                    max={30}
                  />
                </label>
              ))}
              <label>
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={o.active}
                />{" "}
                Active
              </label>
            </div>
            <button className="btn btn-small" disabled={busy}>
              {o.id ? "Save offer" : "Add offer"}
            </button>
          </form>
        ))}
      {tab === "Website Settings" && (
        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            save("settings", {
              id: "website",
              value: {
                ...data.settings[0].value,
                supportEmail: f.get("supportEmail"),
                bookingEnabled: f.get("bookingEnabled") === "on",
              },
            });
          }}
        >
          <h2>Website settings</h2>
          <label className="field">
            Support email
            <input
              type="email"
              name="supportEmail"
              defaultValue={data.settings[0]?.value.supportEmail}
            />
            <small className="muted">
              Displayed on the support page when provided.
            </small>
          </label>
          <label className="row">
            <input
              name="bookingEnabled"
              type="checkbox"
              defaultChecked={data.settings[0]?.value.bookingEnabled}
            />{" "}
            Accept new simulated bookings
          </label>
          <button className="btn" style={{ marginTop: 20 }} disabled={busy}>
            Save settings
          </button>
          <p className="muted" style={{ marginTop: 20 }}>
            Administrator roles are assigned securely in the database. Payment
            mode cannot be changed here.
          </p>
        </form>
      )}
      {tab === "Admin Users / Security" && <div className="panel"><h2>Administrator security</h2><p>Administrator roles are managed directly in Supabase profiles. This prevents a customer from elevating their own access through the website.</p><p>Every admin API verifies the signed-in user’s role server-side and records manual payment decisions in the audit log.</p><h3>Recent audit actions</h3><p className="muted">Review records directly in the `admin_audit_logs` table until an audit viewer is added.</p></div>}
    </div>
  );
}

function BankForm({account,busy,save,remove}:{account?:{id:string;bank_name:string;account_name:string;account_number:string;currency:string;routing_information:string;instructions:string;enabled:boolean;display_order:number};busy:boolean;save:(table:string,record:unknown)=>Promise<void>;remove:(table:"bank_accounts",id:string)=>Promise<void>}){return <form className="panel" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);save("bank_accounts",{id:account?.id,bank_name:f.get("bank"),account_name:f.get("accountName"),account_number:f.get("accountNumber"),currency:String(f.get("currency")).toUpperCase(),routing_information:f.get("routing")??"",instructions:f.get("instructions"),enabled:f.get("enabled")==="on",display_order:Number(f.get("order"))});}}><h3>{account?"Edit bank account":"Add bank account"}</h3><div className="form-grid"><label className="field">Bank name<input name="bank" defaultValue={account?.bank_name} required/></label><label className="field">Account holder<input name="accountName" defaultValue={account?.account_name} required/></label><label className="field">Account number<input name="accountNumber" defaultValue={account?.account_number} required/></label><label className="field">Currency<input name="currency" defaultValue={account?.currency??"NGN"} maxLength={3} required/></label><label className="field">Routing information (optional)<input name="routing" defaultValue={account?.routing_information??""}/></label><label className="field">Display order<input name="order" type="number" defaultValue={account?.display_order??0}/></label><label className="field wide">Customer instructions<textarea name="instructions" defaultValue={account?.instructions??""}/></label></div><label><input name="enabled" type="checkbox" defaultChecked={account?.enabled??true}/> Enabled</label><button className="btn btn-small" disabled={busy}>{account?"Save bank account":"Add bank account"}</button>{account&&<button type="button" className="text-button" disabled={busy} onClick={()=>remove("bank_accounts",account.id)}>Remove account</button>}</form>}
function WalletForm({wallet,busy,save,remove}:{wallet?:{id:string;display_name:string;wallet_address:string;network:string;instructions:string;qr_path:string|null;enabled:boolean;display_order:number};busy:boolean;save:(table:string,record:unknown)=>Promise<void>;remove:(table:"bitcoin_wallets",id:string)=>Promise<void>}){const [preview,setPreview]=useState("");async function generate(){if(!wallet)return;const r=await fetch("/api/admin/payment-qr",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({walletId:wallet.id})});if(!r.ok)return;const p=await fetch(`/api/admin/payment-qr?walletId=${wallet.id}`);const d=await p.json();setPreview(d.url??"");}return <form className="panel" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);save("bitcoin_wallets",{id:wallet?.id,display_name:f.get("name"),wallet_address:f.get("wallet"),network:f.get("network"),instructions:f.get("instructions"),qr_path:wallet?.qr_path??null,enabled:f.get("enabled")==="on",display_order:Number(f.get("order"))});}}><h3>{wallet?"Edit Bitcoin wallet":"Add Bitcoin wallet"}</h3><div className="form-grid"><label className="field">Display name<input name="name" defaultValue={wallet?.display_name??"Bitcoin (BTC)"} required/></label><label className="field">Network<input name="network" defaultValue={wallet?.network??"Bitcoin"} required/></label><label className="field wide">Public receiving address<input name="wallet" defaultValue={wallet?.wallet_address} required/></label><label className="field">Display order<input name="order" type="number" defaultValue={wallet?.display_order??0}/></label><label className="field wide">Customer instructions<textarea name="instructions" defaultValue={wallet?.instructions??""}/></label></div><label><input name="enabled" type="checkbox" defaultChecked={wallet?.enabled??true}/> Enabled for test checkout</label><button className="btn btn-small" disabled={busy}>{wallet?"Save wallet":"Add wallet"}</button>{wallet&&<><button type="button" className="text-button" disabled={busy} onClick={generate}>Generate QR code</button><button type="button" className="text-button" disabled={busy} onClick={()=>remove("bitcoin_wallets",wallet.id)}>Remove wallet</button>{preview&&<img className="payment-qr" src={preview} alt="Bitcoin payment QR preview"/>}</>}<p className="muted">Store public test addresses only. Never enter a private key or recovery phrase.</p></form>}
