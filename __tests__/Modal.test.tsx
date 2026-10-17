import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import Modal from '../components/Modal'

describe('Modal stack', () => {
  it('portals stacked dialogs and limits keyboard handling to the top modal', () => {
    const onParentClose = vi.fn()
    const onChildClose = vi.fn()

    function ModalHarness() {
      const [parentOpen, setParentOpen] = useState(false)
      const [childOpen, setChildOpen] = useState(false)

      return (
        <>
          <button onClick={() => setParentOpen(true)}>Open parent</button>
          <Modal
            open={parentOpen}
            onClose={() => {
              onParentClose()
              setParentOpen(false)
            }}
            title="Parent dialog"
          >
            <button onClick={() => setChildOpen(true)}>Open child</button>
          </Modal>
          <Modal
            open={childOpen}
            onClose={() => {
              onChildClose()
              setChildOpen(false)
            }}
            title="Child dialog"
          >
            <button>Child action</button>
            <button>Another child action</button>
          </Modal>
        </>
      )
    }

    render(<ModalHarness />)

    const parentTrigger = screen.getByRole('button', { name: 'Open parent' })
    parentTrigger.focus()
    fireEvent.click(parentTrigger)

    const openChildButton = screen.getByRole('button', { name: 'Open child' })
    fireEvent.click(openChildButton)

    const childDialog = screen.getByRole('dialog', { name: 'Child dialog' })
    expect(childDialog.parentElement?.parentElement).toBe(document.body)

    const parentFocus = vi.spyOn(openChildButton, 'focus')
    const childAction = screen.getByRole('button', { name: 'Child action' })
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(parentFocus).not.toHaveBeenCalled()
    expect(childAction).toHaveFocus()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onChildClose).toHaveBeenCalledOnce()
    expect(onParentClose).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog', { name: 'Child dialog' })).not.toBeInTheDocument()
    expect(openChildButton).toHaveFocus()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onParentClose).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog', { name: 'Parent dialog' })).not.toBeInTheDocument()
    expect(parentTrigger).toHaveFocus()
  })
})