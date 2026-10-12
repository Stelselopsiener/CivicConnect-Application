/**
 * Unit tests for form validation (Strategy rules).
 * Basis: REQ-001 to REQ-003, CR-001, PED §12.3 layer 1, REQ-023 / REQ-030.
 * Technique: equivalence partitioning (valid / each invalid class) and boundary values
 * (title length 80 / 81, end date equal to / before start date, password length 7 / 8).
 */
import { describe, expect, it } from 'vitest'
import { TITLE_MAX, registerSchema, requestSchema, rules, validate } from './validation'

const validRequest = {
  category: 'Maintenance',
  title: 'Broken tap in hall kitchen',
  description: 'The cold tap does not close.',
  streetAddress: '12 Church St',
  startDate: '2026-09-22',
  endDate: '',
}

describe('request form', () => {
  it('accepts a complete request with no end date (ongoing problem)', () => {
    expect(validate(validRequest, requestSchema)).toMatchObject({ valid: true, list: [] })
  })

  it('reports every empty mandatory field, in form order', () => {
    const result = validate({ category: '', title: ' ', description: '', streetAddress: '', startDate: '', endDate: '' }, requestSchema)
    expect(result.valid).toBe(false)
    expect(result.list.map((item) => item.field)).toEqual(['category', 'title', 'description', 'streetAddress', 'startDate'])
  })

  it('rejects a category that is not in the controlled list', () => {
    expect(validate({ ...validRequest, category: 'Potholes' }, requestSchema).errors.category).toMatch(/Choose the category/)
  })

  it('accepts a title of exactly 80 characters and rejects 81', () => {
    expect(validate({ ...validRequest, title: 'x'.repeat(TITLE_MAX) }, requestSchema).valid).toBe(true)
    expect(validate({ ...validRequest, title: 'x'.repeat(TITLE_MAX + 1) }, requestSchema).errors.title).toMatch(/80 characters/)
  })

  it('accepts an end date equal to the start date and rejects one day earlier', () => {
    expect(validate({ ...validRequest, endDate: '2026-09-22' }, requestSchema).valid).toBe(true)
    const result = validate({ ...validRequest, endDate: '2026-09-21' }, requestSchema)
    expect(result.errors.endDate).toMatch(/cannot be before the start date \(22 Sept? 2026\)/)
  })

  it('rejects a start date in the future', () => {
    expect(validate({ ...validRequest, startDate: '2999-01-01' }, requestSchema).errors.startDate).toMatch(/future/)
  })
})

describe('registration form', () => {
  const valid = { name: 'Thandi Mokoena', email: 'thandi.m@example.org', password: 'eight888', confirmPassword: 'eight888' }

  it('accepts name, email and an 8-character password', () => {
    expect(validate(valid, registerSchema).valid).toBe(true)
  })

  it('rejects a 7-character password', () => {
    expect(validate({ ...valid, password: 'seven77', confirmPassword: 'seven77' }, registerSchema).errors.password).toMatch(/at least 8/)
  })

  it.each(['thandi', 'thandi@', 'thandi@example', 'a b@example.org'])('rejects malformed email "%s"', (email) => {
    expect(validate({ ...valid, email }, registerSchema).errors.email).toBeDefined()
  })

  it('rejects mismatched passwords', () => {
    expect(validate({ ...valid, confirmPassword: 'eight889' }, registerSchema).errors.confirmPassword).toMatch(/do not match/)
  })
})

describe('validate', () => {
  it('reports only the first failing rule per field', () => {
    const schema = { name: [rules.required('required'), rules.minLength(3, 'too short')] }
    expect(validate({ name: '' }, schema).list).toEqual([{ field: 'name', message: 'required' }])
  })
})
