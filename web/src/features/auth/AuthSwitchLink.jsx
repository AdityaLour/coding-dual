import { Link, useOutletContext } from "react-router";

// Link between login and signup that plays the banner first.
// Ctrl/Cmd/Shift-clicks still open normally, e.g. in a new tab.
export default function AuthSwitchLink({ to, children }) {
  const { switchTo } = useOutletContext();

  function handleClick(event) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    switchTo(to);
  }

  return (
    <Link to={to} onClick={handleClick}>
      {children}
    </Link>
  );
}
