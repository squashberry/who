const DEFAULT_CONFIG = {
  appVersion: "1.0.0",
  latestVersion: "1.0.0",
  minimumVersion: "1.0.0",
  forceUpdate: false,
  updateUrl: "https://squashberry.github.io/who/download.html",
  forceUpdateTitle: "WHO update required",
  forceUpdateMessage: "You need to update this app to continue using it. WHO is still in beta and we improve it regularly. Please install the latest version to continue using WHO.",
  forceUpdateButton: "Update WHO",
  softUpdateTitle: "A new WHO update is available",
  softUpdateMessage: "A newer version of WHO is available with improvements and fixes.",
  softUpdateButton: "Update now",
  softUpdateLaterButton: "Later",
  welcomeEnabled: true,
  welcomeRevision: 1,
  welcomeTitle: "WHO Beta 1.0",
  welcomeMessage: "This is a WHO Beta 1.0 app created by Squashberry. We really appreciate your feedback as we continue improving WHO.",
  welcomeEmail: "squashberrypro@gmail.com",
  welcomeButtonText: "Continue",
  welcomeFeedbackButtonText: "Give feedback",
  welcomeFeedbackUrl: "https://squashberry.github.io/who/feedback.html",
  maintenanceEnabled: false,
  maintenanceTitle: "WHO is temporarily unavailable",
  maintenanceMessage: "WHO is undergoing maintenance. Please try again later.",
  announcementEnabled: false,
  announcementRevision: 0,
  announcementTitle: "",
  announcementMessage: "",
  announcementButtonText: "Continue",
  announcementActionEnabled: false,
  announcementActionType: "",
  announcementActionButtonText: "",
  announcementActionUrl: "",
  crashReportUrl: ""
};

const jsonHeaders = { "content-type": "application/json; charset=utf-8" };

function response(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...jsonHeaders, ...extra }
  });
}

function originAllowed(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  const allowed = (env.PUBLIC_ORIGIN || "https://squashberry.github.io").split(",").map(x => x.trim()).filter(Boolean);
  return allowed.includes(origin);
}

function cors(request, env) {
  const origin = request.headers.get("Origin");
  const allowed = origin && (env.PUBLIC_ORIGIN || "https://squashberry.github.io").split(",").map(x => x.trim()).includes(origin)
    ? origin
    : "https://squashberry.github.io";
  return {
    "access-control-allow-origin": allowed,
    "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
    "access-control-allow-headers": "Content-Type, Authorization, X-WHO-Admin-Key",
    "access-control-max-age": "86400",
    "vary": "Origin"
  };
}

function json(request, env, body, status=200) {
  return response(body, status, cors(request, env));
}

function now() {
  return Date.now();
}

async function readBody(request) {
  try { return await request.json(); } catch { return {}; }
}

function adminAuthorized(request, env) {
  if (!env.ADMIN_API_KEY) return false;
  const auth = request.headers.get("Authorization") || "";
  const xKey = request.headers.get("X-WHO-Admin-Key") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : xKey.trim();
  return token.length > 0 && token === env.ADMIN_API_KEY;
}

async function requireAdmin(request, env) {
  if (!originAllowed(request, env)) return json(request, env, { success:false, error:"ORIGIN_NOT_ALLOWED" }, 403);
  if (!adminAuthorized(request, env)) return json(request, env, { success:false, error:"ADMIN_UNAUTHORIZED" }, 401);
  return null;
}

async function getConfig(env) {
  const row = await env.DB.prepare("SELECT config_json FROM app_config WHERE id = 1").first();
  if (!row?.config_json) {
    await env.DB.prepare(
      "INSERT OR IGNORE INTO app_config (id, config_json, updated_at) VALUES (1, ?, ?)"
    ).bind(JSON.stringify(DEFAULT_CONFIG), now()).run();
    return { ...DEFAULT_CONFIG };
  }
  try { return { ...DEFAULT_CONFIG, ...JSON.parse(row.config_json) }; }
  catch { return { ...DEFAULT_CONFIG }; }
}

async function saveConfig(env, config) {
  const merged = { ...DEFAULT_CONFIG, ...config };
  await env.DB.prepare(
    "INSERT INTO app_config (id, config_json, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET config_json = excluded.config_json, updated_at = excluded.updated_at"
  ).bind(JSON.stringify(merged), now()).run();
  return merged;
}

async function audit(env, actor, action, target, beforeValue, afterValue, result="success") {
  await env.DB.prepare(
    "INSERT INTO audit_log (actor, action, target, before_json, after_json, result, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(actor, action, target, JSON.stringify(beforeValue ?? null), JSON.stringify(afterValue ?? null), result, now()).run();
}

async function stats(env) {
  const [users, devices, reports, crashes, feedback] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS count FROM users").first(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM devices").first(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM reports WHERE status = 'pending'").first(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM crashes WHERE status = 'pending'").first(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM feedback WHERE status = 'new'").first()
  ]);
  return {
    users: Number(users?.count || 0),
    devices: Number(devices?.count || 0),
    pendingReports: Number(reports?.count || 0),
    pendingCrashes: Number(crashes?.count || 0),
    newFeedback: Number(feedback?.count || 0)
  };
}

async function routeAdmin(request, env, url) {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;

  const path = url.pathname;
  const method = request.method;

  if (path === "/admin/verify" && method === "GET") {
    return json(request, env, { success:true, authenticated:true, service:"WHO Control API" });
  }

  if (path === "/admin/bootstrap" && method === "GET") {
    const [config, summary, users, reports, crashes, feedback, auditRows] = await Promise.all([
      getConfig(env),
      stats(env),
      env.DB.prepare("SELECT id, phone_masked, platform, app_version, last_seen, status FROM users ORDER BY last_seen DESC LIMIT 100").all(),
      env.DB.prepare("SELECT id, phone_masked, reason, report_count, status, created_at FROM reports ORDER BY created_at DESC LIMIT 100").all(),
      env.DB.prepare("SELECT id, received_at, app_version, platform, fatal, error, status FROM crashes ORDER BY received_at DESC LIMIT 100").all(),
      env.DB.prepare("SELECT id, category, title, message, version, status, created_at FROM feedback ORDER BY created_at DESC LIMIT 100").all(),
      env.DB.prepare("SELECT id, actor, action, target, result, created_at FROM audit_log ORDER BY created_at DESC LIMIT 100").all()
    ]);
    return json(request, env, {
      success:true,
      config, summary,
      users: users.results || [],
      reports: reports.results || [],
      crashes: crashes.results || [],
      feedback: feedback.results || [],
      audit: auditRows.results || []
    });
  }

  if (path === "/admin/config" && method === "GET") {
    return json(request, env, { success:true, config: await getConfig(env) });
  }

  if (path === "/admin/config" && method === "PUT") {
    const before = await getConfig(env);
    const body = await readBody(request);
    const config = await saveConfig(env, body.config || body);
    const revision = Number(config.announcementRevision || 0);
    if (config.announcementEnabled && revision > 0) {
      await env.DB.prepare(
        "INSERT OR REPLACE INTO announcement_versions (revision, title, message, button_text, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      ).bind(
        revision,
        config.announcementTitle || "",
        config.announcementMessage || "",
        config.announcementButtonText || "Continue",
        1,
        now()
      ).run();
    }
    await audit(env, "admin", "update_config", "app_config", before, config);
    return json(request, env, { success:true, config });
  }

  if (path === "/admin/stats" && method === "GET") {
    return json(request, env, { success:true, summary: await stats(env) });
  }

  if (path === "/admin/users" && method === "GET") {
    const rows = await env.DB.prepare("SELECT id, phone_masked, platform, app_version, last_seen, status FROM users ORDER BY last_seen DESC LIMIT 200").all();
    return json(request, env, { success:true, users: rows.results || [] });
  }

  if (path === "/admin/reports" && method === "GET") {
    const rows = await env.DB.prepare("SELECT id, phone_masked, reason, report_count, status, created_at, resolved_at FROM reports ORDER BY created_at DESC LIMIT 200").all();
    return json(request, env, { success:true, reports: rows.results || [] });
  }

  if (path.match(/^\/admin\/reports\/[^/]+\/resolve$/) && method === "POST") {
    const id = path.split("/")[3];
    await env.DB.prepare("UPDATE reports SET status = 'resolved', resolved_at = ? WHERE id = ?").bind(now(), id).run();
    await audit(env, "admin", "resolve_report", id, {status:"pending"}, {status:"resolved"});
    return json(request, env, { success:true });
  }

  if (path === "/admin/crashes" && method === "GET") {
    const rows = await env.DB.prepare("SELECT id, received_at, app_version, platform, fatal, error, status, fixed_at FROM crashes ORDER BY received_at DESC LIMIT 200").all();
    return json(request, env, { success:true, crashes: rows.results || [] });
  }

  if (path.match(/^\/admin\/crashes\/[^/]+\/status$/) && method === "POST") {
    const id = path.split("/")[3];
    const body = await readBody(request);
    const status = body.status === "fixed" ? "fixed" : "pending";
    await env.DB.prepare("UPDATE crashes SET status = ?, fixed_at = ? WHERE id = ?")
      .bind(status, status === "fixed" ? now() : null, id).run();
    await audit(env, "admin", "update_crash_status", id, null, {status});
    return json(request, env, { success:true });
  }

  if (path === "/admin/feedback" && method === "GET") {
    const rows = await env.DB.prepare("SELECT id, category, title, message, version, status, created_at FROM feedback ORDER BY created_at DESC LIMIT 200").all();
    return json(request, env, { success:true, feedback: rows.results || [] });
  }

  if (path === "/admin/audit" && method === "GET") {
    const rows = await env.DB.prepare("SELECT id, actor, action, target, result, created_at FROM audit_log ORDER BY created_at DESC LIMIT 300").all();
    return json(request, env, { success:true, audit: rows.results || [] });
  }

  if (path === "/admin/intelligence/lookup" && method === "POST") {
    const body = await readBody(request);
    const key = String(body.lookup_key || "").trim();
    if (!key) return json(request, env, {success:false, error:"LOOKUP_KEY_REQUIRED"}, 400);
    const rows = await env.DB.prepare(
      "SELECT candidate_name, confidence, contribution_count FROM number_identity_candidates WHERE lookup_key = ? ORDER BY confidence DESC LIMIT 10"
    ).bind(key).all();
    return json(request, env, { success:true, candidates: rows.results || [] });
  }

  return json(request, env, { success:false, error:"ADMIN_ROUTE_NOT_FOUND" }, 404);
}

async function routePublic(request, env, url) {
  const path = url.pathname;
  const method = request.method;

  if (path === "/health" && method === "GET") {
    return json(request, env, {success:true, service:"WHO Control API", status:"online", time:now()});
  }

  if (path === "/config" && method === "GET") {
    return json(request, env, {success:true, config: await getConfig(env)});
  }

  if (path === "/presence/heartbeat" && method === "POST") {
    const body = await readBody(request);
    const deviceId = String(body.deviceId || body.device_id || "").trim();
    if (!deviceId) return json(request, env, {success:false, error:"DEVICE_ID_REQUIRED"}, 400);
    const platform = String(body.platform || "android");
    const appVersion = String(body.appVersion || body.app_version || "unknown");
    const userId = body.userId || body.user_id || null;
    await env.DB.prepare(
      "INSERT INTO devices (id, user_id, platform, app_version, last_seen, status) VALUES (?, ?, ?, ?, ?, 'active') ON CONFLICT(id) DO UPDATE SET user_id = excluded.user_id, platform = excluded.platform, app_version = excluded.app_version, last_seen = excluded.last_seen, status = 'active'"
    ).bind(deviceId, userId, platform, appVersion, now()).run();
    return json(request, env, {success:true});
  }

  if (path === "/announcement/response" && method === "POST") {
    const body = await readBody(request);
    await env.DB.prepare(
      "INSERT INTO announcement_responses (revision, response, device_id, created_at) VALUES (?, ?, ?, ?)"
    ).bind(Number(body.revision || 0), String(body.response || ""), body.deviceId || body.device_id || null, now()).run();
    return json(request, env, {success:true});
  }

  return json(request, env, {success:false, error:"NOT_FOUND"}, 404);
}

export default {
  async fetch(request, env) {
    const headers = cors(request, env);
    if (request.method === "OPTIONS") return new Response(null, {status:204, headers});
    try {
      const url = new URL(request.url);
      if (url.pathname.startsWith("/admin/")) return await routeAdmin(request, env, url);
      return await routePublic(request, env, url);
    } catch (error) {
      return json(request, env, {success:false, error:"INTERNAL_ERROR", message:String(error?.message || error)}, 500);
    }
  }
};
