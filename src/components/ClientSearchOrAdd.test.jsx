// src/components/ClientSearchOrAdd.test.jsx
import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test/test-utils'
import ClientSearchOrAdd from './ClientSearchOrAdd'

describe('<ClientSearchOrAdd>', () => {
  it('renders all clients initially', () => {
    renderWithProviders(<ClientSearchOrAdd onSelect={() => {}} />)
    // Seed has 10 clients
    expect(screen.getByText('Arjun S.')).toBeInTheDocument()
    expect(screen.getByText('Meera R.')).toBeInTheDocument()
    expect(screen.getByText('Kavya M.')).toBeInTheDocument()
  })

  it('filters by typed text', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ClientSearchOrAdd onSelect={() => {}} autoFocus={false} />)
    const input = screen.getByPlaceholderText(/Search client/i)
    await user.type(input, 'arjun')
    expect(screen.getByText('Arjun S.')).toBeInTheDocument()
    expect(screen.queryByText('Meera R.')).not.toBeInTheDocument()
  })

  it('shows "Add new client, <text>" when no matches', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ClientSearchOrAdd onSelect={() => {}} autoFocus={false} />)
    const input = screen.getByPlaceholderText(/Search client/i)
    await user.type(input, 'Zorblax')
    expect(screen.getByText(/No client found/i)).toBeInTheDocument()
    expect(screen.getByText(/Add new client, Zorblax/i)).toBeInTheDocument()
  })

  it('fires onSelect when an existing client is clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    renderWithProviders(<ClientSearchOrAdd onSelect={onSelect} autoFocus={false} />)
    await user.click(screen.getByText('Arjun S.'))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect.mock.calls[0][0]).toMatchObject({ firstName: 'Arjun', lastName: 'Sharma' })
  })

  it('uses onCreate when provided instead of default add', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    renderWithProviders(<ClientSearchOrAdd onSelect={() => {}} onCreate={onCreate} autoFocus={false} />)
    const input = screen.getByPlaceholderText(/Search client/i)
    await user.type(input, 'Tara Joshi')
    await user.click(screen.getByText(/Add new client, Tara Joshi/i))
    expect(onCreate).toHaveBeenCalledTimes(1)
    expect(onCreate.mock.calls[0][0]).toEqual({ firstName: 'Tara', lastName: 'Joshi' })
    expect(onCreate.mock.calls[0][1]).toBe('Tara Joshi')
  })

  it('defaults to addClient + onSelect when onCreate is not provided', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    renderWithProviders(<ClientSearchOrAdd onSelect={onSelect} autoFocus={false} />)
    const input = screen.getByPlaceholderText(/Search client/i)
    await user.type(input, 'Solo')
    await user.click(screen.getByText(/Add new client, Solo/i))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect.mock.calls[0][0]).toMatchObject({ firstName: 'Solo', lastName: '' })
  })

  it('respects excludeIds', () => {
    renderWithProviders(<ClientSearchOrAdd onSelect={() => {}} excludeIds={['c1', 'c2']} autoFocus={false} />)
    expect(screen.queryByText('Arjun S.')).not.toBeInTheDocument()
    expect(screen.queryByText('Meera R.')).not.toBeInTheDocument()
    expect(screen.getByText('Rohan K.')).toBeInTheDocument()
  })
})
