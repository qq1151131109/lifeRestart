import { render, screen } from '@testing-library/react'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { LandscapeLockout } from './LandscapeLockout'

function mockMatchMedia(matches: boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation(() => ({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    media: '',
    onchange: null,
  })))
}

describe('LandscapeLockout', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders children when portrait', () => {
    mockMatchMedia(false)
    render(<LandscapeLockout><div>Game</div></LandscapeLockout>)
    expect(screen.getByText('Game')).toBeInTheDocument()
    expect(screen.queryByText('请竖屏游玩')).not.toBeInTheDocument()
  })

  it('renders rotate prompt when landscape', () => {
    mockMatchMedia(true)
    render(<LandscapeLockout><div>Game</div></LandscapeLockout>)
    expect(screen.getByText('请竖屏游玩')).toBeInTheDocument()
    expect(screen.queryByText('Game')).not.toBeInTheDocument()
  })
})
