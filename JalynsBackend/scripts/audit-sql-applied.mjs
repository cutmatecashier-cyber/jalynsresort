import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sqlDir = path.resolve(__dirname, '../../supabase')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function extract(sql) {
  const tables = new Set()
  const buckets = new Set()
  const funcs = new Set()

  for (const m of sql.matchAll(/create\s+table\s+if\s+not\s+exists\s+public\.(\w+)/gi)) {
    tables.add(m[1])
  }
  for (const m of sql.matchAll(/alter\s+table\s+(?:if\s+exists\s+)?public\.(\w+)/gi)) {
    tables.add(m[1])
  }
  for (const m of sql.matchAll(/values\s*\(\s*'([a-z0-9-]+)'\s*,\s*'\1'/gi)) {
    buckets.add(m[1])
  }
  for (const m of sql.matchAll(/bucket_id\s*=\s*'([^']+)'/gi)) {
    buckets.add(m[1])
  }
  for (const m of sql.matchAll(/create\s+or\s+replace\s+function\s+public\.(\w+)/gi)) {
    funcs.add(m[1])
  }

  return {
    tables: [...tables],
    buckets: [...buckets],
    funcs: [...funcs],
  }
}

const skipTables = new Set(['objects', 'users', 'buckets'])
const tableCache = new Map()

async function tableStatus(name) {
  if (tableCache.has(name)) return tableCache.get(name)
  const { error } = await supabase.from(name).select('*', { count: 'exact', head: true })
  const status = error ? `MISSING (${error.message.split('\n')[0].slice(0, 60)})` : 'OK'
  tableCache.set(name, status)
  return status
}

const { data: bucketList } = await supabase.storage.listBuckets()
const bucketIds = new Set((bucketList || []).map((b) => b.id))

const files = readdirSync(sqlDir)
  .filter((f) => f.endsWith('.sql'))
  .sort()

const rows = []

for (const file of files) {
  if (file === 'PENDING_TO_RUN.sql') continue

  const sql = readFileSync(path.join(sqlDir, file), 'utf8')
  const { tables, buckets, funcs } = extract(sql)
  const issues = []
  const okBits = []

  for (const t of tables) {
    if (skipTables.has(t)) continue
    const st = await tableStatus(t)
    if (st === 'OK') okBits.push(`table:${t}`)
    else issues.push(`table missing: ${t}`)
  }

  for (const b of buckets) {
    if (bucketIds.has(b)) okBits.push(`bucket:${b}`)
    else issues.push(`bucket missing: ${b}`)
  }

  if (funcs.length) okBits.push(`funcs declared: ${funcs.join(',')}`)

  if (file === 'DROP_RESTAURANT_CATEGORY_IMAGE.sql') {
    const { error } = await supabase.from('restaurant_menu_categories').select('image_url').limit(1)
    if (!error) {
      issues.push('image_url column STILL EXISTS — drop SQL not applied')
    } else if (/column|does not exist|Could not find/i.test(error.message)) {
      okBits.push('image_url dropped')
    } else {
      issues.push(`category image check: ${error.message}`)
    }
  }

  if (
    file === 'MAKE_ROCHELLE_ADMIN.sql' ||
    file === 'FIX_ROCHELLE_PROFILE.sql'
  ) {
    const { data, error } = await supabase
      .from('profiles')
      .select('email, role, approval_status')
      .ilike('email', '%rochelle%')
      .maybeSingle()
    if (error) issues.push(`rochelle check: ${error.message}`)
    else if (!data) issues.push('rochelle profile row not found')
    else if (data.role !== 'admin' || data.approval_status !== 'approved') {
      issues.push(`rochelle not admin/approved (${data.role}/${data.approval_status})`)
    } else {
      okBits.push('rochelle=admin/approved')
    }
  }

  if (file === 'GRANT_PROFILES_ACCESS.sql' || file === 'MEMBER_MANAGEMENT.sql') {
    const { error } = await supabase.from('profiles').select('id').limit(1)
    if (error) issues.push(`profiles access: ${error.message}`)
    else okBits.push('profiles readable')
  }

  if (file === 'MEMBER_REJECT_PERMANENT.sql' || file === 'MEMBER_MANAGEMENT.sql') {
    // soft check: profiles has rejection-related columns if selectable
    const { error } = await supabase
      .from('profiles')
      .select('id, role, approval_status')
      .limit(1)
    if (error) issues.push(`member mgmt columns: ${error.message}`)
    else okBits.push('member fields readable')
  }

  rows.push({
    file,
    status: issues.length ? 'NOT FULLY APPLIED' : 'OK / APPLIED',
    issues,
    okBits,
  })
}

console.log('\n=== SQL AUDIT vs SUPABASE ===\n')
for (const r of rows) {
  console.log(`${r.status.padEnd(18)}  ${r.file}`)
  if (r.issues.length) {
    for (const i of r.issues) console.log(`  ! ${i}`)
  } else if (r.okBits.length) {
    console.log(`  · ${r.okBits.slice(0, 4).join(' | ')}`)
  }
}

const bad = rows.filter((r) => r.status !== 'OK / APPLIED')
console.log('\n=== SUMMARY ===')
console.log(`OK: ${rows.length - bad.length} / ${rows.length}`)
console.log(`Needs attention: ${bad.length}`)
if (bad.length) console.log(bad.map((b) => b.file).join(', '))
else console.log('PENDING_TO_RUN.sql: no need to run — all covered files look applied.')
