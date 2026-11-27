/* NÛR — compteur de présence anonyme (application et page de présentation).
 * Actif seulement si config.json contient { "presence": { "url": "https://<projet>.supabase.co", "key": "<clé publique anon>" } }.
 * Envoie uniquement : un identifiant aléatoire de connexion et le lieu ("app" ou "page"). Aucun prénom, aucune position.
 * Protocole : Supabase Realtime (Phoenix, vsn 1.0.0), canal de présence « nur ».
 * Total des installations : table nur_installs (colonne id uuid), insertion d'un identifiant aléatoire une seule fois par appareil. */
(function (root) {
  "use strict";
  function uuid() { try { return crypto.randomUUID(); } catch (e) { return "x" + Date.now().toString(36) + Math.random().toString(36).slice(2); } }
  function NurPresence(cfg, where, onCount) {
    var ws, ref = 0, hb, state = {}, retry = 1000, me = uuid(), stopped = false, topic = "realtime:nur";
    function send(o) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); }
    function count() {
      var c = { app: 0, page: 0 };
      Object.keys(state).forEach(function (k) { (state[k] || []).forEach(function (m) { if (m.where === "app") c.app++; else if (m.where === "page") c.page++; }); });
      onCount(c);
    }
    function open() {
      if (stopped) return;
      ws = new WebSocket(cfg.url.replace(/^http/, "ws") + "/realtime/v1/websocket?apikey=" + encodeURIComponent(cfg.key) + "&vsn=1.0.0");
      ws.onopen = function () {
        retry = 1000; ref = 0; state = {};
        send({ topic: topic, event: "phx_join", payload: { config: { presence: { key: me }, broadcast: { self: false } }, access_token: cfg.key }, ref: String(++ref), join_ref: "1" });
        send({ topic: topic, event: "presence", payload: { type: "presence", event: "track", payload: { where: where } }, ref: String(++ref), join_ref: "1" });
        hb = setInterval(function () { send({ topic: "phoenix", event: "heartbeat", payload: {}, ref: String(++ref) }); }, 25000);
      };
      ws.onmessage = function (e) {
        var m; try { m = JSON.parse(e.data); } catch (x) { return; }
        if (m.event === "presence_state") { state = {}; Object.keys(m.payload || {}).forEach(function (k) { state[k] = m.payload[k].metas || []; }); count(); }
        else if (m.event === "presence_diff") {
          var p = m.payload || {};
          Object.keys(p.leaves || {}).forEach(function (k) { delete state[k]; });
          Object.keys(p.joins || {}).forEach(function (k) { state[k] = p.joins[k].metas || []; });
          count();
        }
      };
      ws.onclose = function () { clearInterval(hb); if (!stopped) { setTimeout(open, retry); retry = Math.min(retry * 2, 30000); } };
      ws.onerror = function () { try { ws.close(); } catch (x) {} };
    }
    document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible" && (!ws || ws.readyState > 1)) open(); });
    open();
    return { stop: function () { stopped = true; try { ws.close(); } catch (x) {} } };
  }
  function installs(cfg, register) {
    var h = { apikey: cfg.key, Authorization: "Bearer " + cfg.key };
    var p = Promise.resolve();
    if (register) {
      var k = "nur:install-id", id = null; try { id = localStorage.getItem(k); } catch (e) {}
      if (!id) {
        id = uuid();
        p = fetch(cfg.url + "/rest/v1/nur_installs", { method: "POST", headers: Object.assign({ "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=minimal" }, h), body: JSON.stringify({ id: id }) })
          .then(function (r) { if (r.ok) try { localStorage.setItem(k, id); } catch (e) {} }).catch(function () {});
      }
    }
    return p.then(function () {
      return fetch(cfg.url + "/rest/v1/nur_installs?select=id", { method: "HEAD", headers: Object.assign({ Prefer: "count=exact" }, h) })
        .then(function (r) { var cr = r.headers.get("content-range") || ""; var n = +cr.split("/")[1]; return isFinite(n) ? n : null; }).catch(function () { return null; });
    });
  }
  root.NurPresence = { start: NurPresence, installs: installs };
})(typeof self !== "undefined" ? self : this);
