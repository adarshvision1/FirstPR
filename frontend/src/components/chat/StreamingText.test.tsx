import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StreamingText } from './StreamingText'

test('renders text content correctly', () => {
    render(<StreamingText content="Hello World" />)
    expect(screen.getByText('Hello World')).toBeDefined()
})

test('shows cursor when streaming', () => {
    render(<StreamingText content="Streaming..." isStreaming={true} />)
    expect(screen.getByTestId('cursor')).toBeDefined()
})

test('renders markdown correctly', () => {
    render(<StreamingText content="**Bold**" format="markdown" />)
    const strongElement = screen.getByText('Bold')
    expect(strongElement.tagName).toBe('STRONG')
})
