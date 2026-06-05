// Mock for @base-ui/react/button — used only in Jest tests
// Renders a plain <button> so component tests can work without the real package.
import React from 'react'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: React.ReactNode
  render?: React.ReactElement
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, render: _render, ...props }, ref) => (
    <button ref={ref} {...props}>
      {children}
    </button>
  )
)
Button.displayName = 'Button'

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace Button {
  export type Props = ButtonProps
}

export { Button }
