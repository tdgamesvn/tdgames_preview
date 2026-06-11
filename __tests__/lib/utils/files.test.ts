import { isSystemFile, getExtension } from '@/lib/utils/files'

describe('isSystemFile', () => {
  it('returns true for .DS_Store', () => {
    expect(isSystemFile('.DS_Store')).toBe(true)
  })
  it('returns true for desktop.ini (case-insensitive)', () => {
    expect(isSystemFile('Desktop.INI')).toBe(true)
  })
  it('returns true for Mac resource forks (._filename)', () => {
    expect(isSystemFile('._Knight.json')).toBe(true)
  })
  it('returns true for thumbs.db', () => {
    expect(isSystemFile('Thumbs.db')).toBe(true)
  })
  it('returns false for normal files', () => {
    expect(isSystemFile('Knight.json')).toBe(false)
    expect(isSystemFile('Knight.atlas')).toBe(false)
    expect(isSystemFile('Knight.png')).toBe(false)
  })
})

describe('getExtension', () => {
  it('returns simple extension', () => {
    expect(getExtension('Knight.json')).toBe('json')
    expect(getExtension('Knight.png')).toBe('png')
  })
  it('handles .atlas.txt → atlas', () => {
    expect(getExtension('Knight.atlas.txt')).toBe('atlas')
  })
  it('handles .skel.bytes → skel', () => {
    expect(getExtension('Knight.skel.bytes')).toBe('skel')
  })
  it('returns bin for files with no extension', () => {
    expect(getExtension('noextension')).toBe('bin')
  })
})
