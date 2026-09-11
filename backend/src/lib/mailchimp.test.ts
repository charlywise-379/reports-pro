import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const OLD_ENV = { ...process.env }

async function freshImport() {
  vi.resetModules()
  return import('./mailchimp')
}

beforeEach(() => {
  process.env.MAILCHIMP_API_KEY = 'key0123456789abcdef0123456789abcd-us21'
  process.env.MAILCHIMP_AUDIENCE_ID = 'aud123'
  vi.restoreAllMocks()
})
afterEach(() => {
  process.env = { ...OLD_ENV }
})

describe('subscriberHash', () => {
  it('es el md5 hex del email en minúsculas', async () => {
    const { subscriberHash } = await freshImport()
    // md5("test@example.com") = 55502f40dc8b7c769880b10874abc9d0
    expect(subscriberHash(' TEST@Example.com ')).toBe('55502f40dc8b7c769880b10874abc9d0')
  })
})

describe('isMailchimpEnabled', () => {
  it('true con key válida', async () => {
    const { isMailchimpEnabled } = await freshImport()
    expect(isMailchimpEnabled()).toBe(true)
  })
  it('false sin key', async () => {
    delete process.env.MAILCHIMP_API_KEY
    const { isMailchimpEnabled } = await freshImport()
    expect(isMailchimpEnabled()).toBe(false)
  })
})

describe('upsertMember', () => {
  it('hace PUT al datacenter del key con status_if_new y merge_fields presentes', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '{}' })
    vi.stubGlobal('fetch', fetchMock)
    const { upsertMember, subscriberHash } = await freshImport()

    await upsertMember({ email: 'a@b.com', firstName: 'Ana', company: null })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe(`https://us21.api.mailchimp.com/3.0/lists/aud123/members/${subscriberHash('a@b.com')}`)
    expect(opts.method).toBe('PUT')
    const body = JSON.parse(opts.body)
    expect(body.email_address).toBe('a@b.com')
    expect(body.status_if_new).toBe('subscribed')
    expect(body.merge_fields).toEqual({ FNAME: 'Ana' }) // LNAME/COMPANY ausentes o null → no van
  })
})

describe('addTags', () => {
  it('POST con status active; vacío = no-op', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '{}' })
    vi.stubGlobal('fetch', fetchMock)
    const { addTags } = await freshImport()

    await addTags('a@b.com', [])
    expect(fetchMock).not.toHaveBeenCalled()

    await addTags('a@b.com', ['estado-trial', 'plan-mensual'])
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/members\/[a-f0-9]{32}\/tags$/)
    expect(JSON.parse(opts.body)).toEqual({
      tags: [{ name: 'estado-trial', status: 'active' }, { name: 'plan-mensual', status: 'active' }],
    })
  })
})

describe('manejo de errores', () => {
  it('sin key: no-op, no lanza, no llama fetch', async () => {
    delete process.env.MAILCHIMP_API_KEY
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { upsertMember } = await freshImport()
    await expect(upsertMember({ email: 'a@b.com' })).resolves.toBeUndefined()
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('HTTP 500 → lanza (reintento)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'boom' }))
    const { addTags } = await freshImport()
    await expect(addTags('a@b.com', ['x'])).rejects.toThrow()
  })
  it('HTTP 429 → lanza (reintento)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429, text: async () => 'slow down' }))
    const { addTags } = await freshImport()
    await expect(addTags('a@b.com', ['x'])).rejects.toThrow()
  })
  it('HTTP 400 → NO lanza (error permanente)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400, text: async () => 'bad email' }))
    const { addTags } = await freshImport()
    await expect(addTags('a@b.com', ['x'])).resolves.toBeUndefined()
  })
})
