import { render, screen, fireEvent } from '@testing-library/react'
import { EmptyState } from '../EmptyState'
import { Users } from 'lucide-react'

describe('EmptyState', () => {
  it('renders with icon, title and description', () => {
    render(
      <EmptyState
        icon={Users}
        title="No Users"
        description="There are no users to display"
      />
    )

    expect(screen.getByText('No Users')).toBeInTheDocument()
    expect(screen.getByText('There are no users to display')).toBeInTheDocument()
  })

  it('renders action button when provided', () => {
    const handleAction = jest.fn()

    render(
      <EmptyState
        icon={Users}
        title="No Users"
        description="Add your first user"
        actionLabel="Add User"
        onAction={handleAction}
      />
    )

    const button = screen.getByText('Add User')
    fireEvent.click(button)

    expect(handleAction).toHaveBeenCalledTimes(1)
  })

  it('does not render action button when not provided', () => {
    render(
      <EmptyState
        icon={Users}
        title="No Users"
        description="There are no users"
      />
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})