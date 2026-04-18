import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PosterModal } from './PosterModal'

const baseProps = {
  dataUrl: 'data:image/png;base64,abc',
  onSwapEvent: vi.fn(),
  onClose: vi.fn(),
}

describe('PosterModal', () => {
  it('renders img with dataUrl as src', () => {
    render(<PosterModal {...baseProps} />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'data:image/png;base64,abc')
  })

  it('renders download link with correct href and filename', () => {
    render(<PosterModal {...baseProps} />)
    const link = screen.getByText('保存图片').closest('a')!
    expect(link).toHaveAttribute('href', 'data:image/png;base64,abc')
    expect(link).toHaveAttribute('download', 'life-poster.png')
  })

  it('calls onSwapEvent when 换一条事件 clicked', () => {
    const onSwapEvent = vi.fn()
    render(<PosterModal {...baseProps} onSwapEvent={onSwapEvent} />)
    fireEvent.click(screen.getByText('换一条事件'))
    expect(onSwapEvent).toHaveBeenCalledOnce()
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    render(<PosterModal {...baseProps} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when overlay background clicked', () => {
    const onClose = vi.fn()
    render(<PosterModal {...baseProps} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('poster-overlay'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does NOT call onClose when clicking inside content', () => {
    const onClose = vi.fn()
    render(<PosterModal {...baseProps} onClose={onClose} />)
    fireEvent.click(screen.getByRole('img'))
    expect(onClose).not.toHaveBeenCalled()
  })
})
