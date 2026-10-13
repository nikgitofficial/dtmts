"use client";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";
import { STATE_META, type LiveDriver, type TrackState, type TrailPoint } from "@/lib/tracking";

export type MapRow = { d: LiveDriver; state: TrackState };
type Props = {
  rows: MapRow[];
  selectedId: string | null;
  trail: TrailPoint[];
  follow: boolean;
  fitSignal: number;
  routeFit: number;
  onSelect: (id: string | null) => void;
};

const CSS = `
.tm{position:relative;width:44px;height:44px}
.tm-dot{position:absolute;inset:7px;border-radius:9999px;display:grid;place-items:center;border:3px solid #fff;color:#fff;box-shadow:0 2px 8px rgba(15,23,42,.35);transition:background .3s}
.tm-dot svg{width:15px;height:15px}
.tm-arrow{position:absolute;inset:0;pointer-events:none;display:none}
.tm-arrow i{position:absolute;left:50%;top:-2px;margin-left:-6px;border:6px solid transparent;border-top:0;border-bottom:9px solid #16a34a}
.tm-label{position:absolute;left:50%;top:100%;transform:translateX(-50%);margin-top:-3px;white-space:nowrap;background:#0f172a;color:#fff;font:600 10px/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.04em;padding:3px 6px;border-radius:6px}
.tm-sel .tm-dot{box-shadow:0 0 0 4px rgba(37,99,235,.35),0 2px 8px rgba(15,23,42,.35)}
.tm-off{opacity:.65}
.tm-wrap{transition:transform 4.8s linear}
.tm-nolag .tm-wrap{transition:none!important}
@media (prefers-reduced-motion:reduce){.tm-wrap{transition:none}}
.rp{width:28px;height:28px;border-radius:9999px;display:grid;place-items:center;color:#fff;font:700 12px/1 ui-sans-serif,system-ui,sans-serif;border:3px solid #fff;box-shadow:0 2px 8px rgba(15,23,42,.35)}
.rp-a{background:#16a34a}.rp-b{background:#dc2626}
`;

const TRUCK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5"/><path d="M14 17h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>`;

const ICON = L.divIcon({
  className: "tm-wrap", iconSize: [44, 44], iconAnchor: [22, 22],
  html: `<div class="tm"><div class="tm-arrow"><i></i></div><div class="tm-dot">${TRUCK}</div><div class="tm-label"></div></div>`,
});

function paint(el: HTMLElement, row: MapRow, selected: boolean) {
  const root = el.firstElementChild as HTMLElement | null;
  if (!root) return;
  const color = STATE_META[row.state].color;
  root.classList.toggle("tm-sel", selected);
  root.classList.toggle("tm-off", row.state === "offline");
  (root.querySelector(".tm-dot") as HTMLElement).style.background = color;
  const arrow = root.querySelector(".tm-arrow") as HTMLElement;
  const show = row.state === "moving" && row.d.heading != null;
  arrow.style.display = show ? "block" : "none";
  if (show) {
    arrow.style.transform = `rotate(${row.d.heading}deg)`;
    (arrow.firstElementChild as HTMLElement).style.borderBottomColor = color;
  }
  root.querySelector(".tm-label")!.textContent = row.d.plateNumber;
}

const hasPos = (d: LiveDriver) => d.lat != null && d.lng != null;

function fitAll(map: L.Map, rows: MapRow[], animate: boolean) {
  const pts = rows.filter((r) => hasPos(r.d)).map((r) => [r.d.lat!, r.d.lng!] as L.LatLngTuple);
  if (!pts.length) return;
  map.fitBounds(L.latLngBounds(pts), { padding: [70, 70], maxZoom: 15, animate });
}

export default function TrackingMap({ rows, selectedId, trail, follow, fitSignal, routeFit, onSelect }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markers = useRef(new Map<string, L.Marker>());
  const trailLayer = useRef<L.LayerGroup | null>(null);
  const routeLayer = useRef<L.LayerGroup | null>(null);
  const roads = useRef(new Map<string, L.LatLngTuple[]>());
  const ring = useRef<L.Circle | null>(null);
  const fitted = useRef(false);
  const rowsRef = useRef(rows);
  const onSelectRef = useRef(onSelect);
  const selRef = useRef(selectedId);
  rowsRef.current = rows;
  onSelectRef.current = onSelect;
  selRef.current = selectedId;

  // Init
  useEffect(() => {
    const el = box.current!;
    const map = L.map(el, { center: [7.5, 125.5], zoom: 7, zoomControl: false, preferCanvas: true });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer(process.env.NEXT_PUBLIC_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: process.env.NEXT_PUBLIC_TILE_ATTRIBUTION
    ?? '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
}).addTo(map);
    trailLayer.current = L.layerGroup().addTo(map);
    routeLayer.current = L.layerGroup().addTo(map);
    map.on("click", () => onSelectRef.current(null));

    let t: ReturnType<typeof setTimeout>;
    map.on("zoomstart", () => { clearTimeout(t); el.classList.add("tm-nolag"); });
    map.on("zoomend", () => { clearTimeout(t); t = setTimeout(() => el.classList.remove("tm-nolag"), 150); });

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    mapRef.current = map;
    const mk = markers.current;
    return () => {
      clearTimeout(t); ro.disconnect(); map.remove();
      mapRef.current = null; trailLayer.current = null; routeLayer.current = null; ring.current = null; fitted.current = false; mk.clear();
    };
  }, []);

  // Sync markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const seen = new Set<string>();
    for (const r of rows) {
      if (!hasPos(r.d)) continue;
      seen.add(r.d.id);
      const ll: L.LatLngTuple = [r.d.lat!, r.d.lng!];
      let m = markers.current.get(r.d.id);
      if (!m) {
        m = L.marker(ll, { icon: ICON, keyboard: false, riseOnHover: true }).addTo(map);
        m.on("click", (e) => { L.DomEvent.stopPropagation(e); onSelectRef.current(r.d.id); });
        markers.current.set(r.d.id, m);
      } else {
        const cur = m.getLatLng();
        if (cur.lat !== ll[0] || cur.lng !== ll[1]) m.setLatLng(ll);
      }
      const el = m.getElement();
      if (el) paint(el, r, r.d.id === selectedId);
      m.setZIndexOffset(r.d.id === selectedId ? 1000 : r.state === "offline" ? -500 : 0);
    }
    for (const [id, m] of markers.current) {
      if (!seen.has(id)) { m.remove(); markers.current.delete(id); }
    }
    if (!fitted.current && seen.size) { fitAll(map, rows, false); fitted.current = true; }
  }, [rows, selectedId]);

  // Fly to a newly selected driver
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const r = rowsRef.current.find((x) => x.d.id === selectedId);
    if (r && hasPos(r.d)) map.flyTo([r.d.lat!, r.d.lng!], Math.max(map.getZoom(), 15), { duration: 0.8 });
  }, [selectedId]);

  // Follow the selected truck
  const sel = rows.find((r) => r.d.id === selectedId);
  const selLat = sel?.d.lat ?? null, selLng = sel?.d.lng ?? null, selAcc = sel?.d.accuracy ?? null;
  useEffect(() => {
    if (follow && selLat != null && selLng != null) mapRef.current?.panTo([selLat, selLng], { animate: true, duration: 1 });
  }, [follow, selLat, selLng]);

  // GPS accuracy ring
  useEffect(() => {
    const map = mapRef.current;
    ring.current?.remove(); ring.current = null;
    if (!map || selLat == null || selLng == null || selAcc == null || selAcc < 1 || selAcc > 300) return;
    ring.current = L.circle([selLat, selLng], {
      radius: selAcc, color: "#2563eb", weight: 1, fillOpacity: 0.08, interactive: false,
    }).addTo(map);
  }, [selLat, selLng, selAcc]);

  // Trail
  useEffect(() => {
    const g = trailLayer.current;
    if (!g) return;
    g.clearLayers();
    if (!selectedId || trail.length < 2) return;
    const pts = trail.map((p) => [p.lat, p.lng] as L.LatLngTuple);
    L.polyline(pts, { color: "#fff", weight: 7, opacity: 0.9, interactive: false }).addTo(g);
    L.polyline(pts, { color: "#2563eb", weight: 4, opacity: 0.9, interactive: false }).addTo(g);
    L.circleMarker(pts[0], { radius: 5, color: "#fff", weight: 2, fillColor: "#0f172a", fillOpacity: 1, interactive: false }).addTo(g);
  }, [trail, selectedId]);

  // Start (A) and destination (B) of the selected truck
  const rFrom = sel?.d.routeFrom ?? "", rTo = sel?.d.routeTo ?? "";
  const aLat = sel?.d.routeFromLat ?? null, aLng = sel?.d.routeFromLng ?? null;
  const bLat = sel?.d.routeToLat ?? null, bLng = sel?.d.routeToLng ?? null;
  useEffect(() => {
    const ctrl = new AbortController();
    const g = routeLayer.current;
    if (!g) return () => ctrl.abort();
    g.clearLayers();
    if (aLat == null || aLng == null || bLat == null || bLng == null) return () => ctrl.abort();

    const a: L.LatLngTuple = [aLat, aLng], b: L.LatLngTuple = [bLat, bLng];
    const pin = (p: L.LatLngTuple, cls: string, letter: string, prefix: string, name: string) => {
      const tip = document.createElement("span"); // textContent, so place names can't inject HTML
      tip.textContent = `${prefix}: ${name}`;
      L.marker(p, {
        icon: L.divIcon({ className: "", html: `<div class="rp ${cls}">${letter}</div>`, iconSize: [28, 28], iconAnchor: [14, 14] }),
        keyboard: false, zIndexOffset: -200,
      }).bindTooltip(tip, { direction: "top", offset: [0, -12] }).addTo(g);
    };
    pin(a, "rp-a", "A", "Start", rFrom);
    pin(b, "rp-b", "B", "Destination", rTo);

    const line = L.polyline([a, b], { color: "#7c3aed", weight: 4, opacity: 0.85, dashArray: "2 10", lineCap: "round", interactive: false }).addTo(g);
    const show = (pts: L.LatLngTuple[]) => { line.setLatLngs(pts); line.setStyle({ dashArray: undefined }); };

    const key = `${a}|${b}`;
    const cached = roads.current.get(key);
    if (cached) { show(cached); return () => ctrl.abort(); }

    // Upgrade the straight line to the real road route when the router answers
    fetch(`https://router.project-osrm.org/route/v1/driving/${a[1]},${a[0]};${b[1]},${b[0]}?overview=full&geometries=geojson`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => {
        const c = j?.routes?.[0]?.geometry?.coordinates as [number, number][] | undefined;
        if (!c?.length) return;
        const pts = c.map(([x, y]) => [y, x] as L.LatLngTuple);
        roads.current.set(key, pts);
        show(pts);
      })
      .catch(() => { /* keep the dashed straight line */ });
    return () => ctrl.abort();
  }, [aLat, aLng, bLat, bLng, rFrom, rTo]);

  // "Show all trucks" button
  useEffect(() => {
    if (fitSignal > 0 && mapRef.current) fitAll(mapRef.current, rowsRef.current, true);
  }, [fitSignal]);

  // "Show route" button: fit start, destination and the truck
  useEffect(() => {
    const map = mapRef.current;
    if (!map || routeFit === 0) return;
    const d = rowsRef.current.find((x) => x.d.id === selRef.current)?.d;
    if (!d || d.routeFromLat == null || d.routeToLat == null) return;
    const pts: L.LatLngTuple[] = [[d.routeFromLat, d.routeFromLng!], [d.routeToLat, d.routeToLng!]];
    if (d.lat != null && d.lng != null) pts.push([d.lat, d.lng]);
    map.fitBounds(L.latLngBounds(pts), { padding: [80, 80], maxZoom: 15 });
  }, [routeFit]);

  return (
    <>
      <style>{CSS}</style>
      <div ref={box} className="absolute inset-0 isolate" />
    </>
  );
}