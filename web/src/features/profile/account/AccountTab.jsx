import { useCallback, useState } from "react";
import { Failed, Skel } from "../Bits.jsx";
import { useActiveSection } from "./useActiveSection.js";
import AccountNav from "./AccountNav.jsx";
import ProfileSection from "./ProfileSection.jsx";
import EmailSection from "./EmailSection.jsx";
import PasswordSection from "./PasswordSection.jsx";
import DevicesSection from "./DevicesSection.jsx";
import DeleteSection from "./DeleteSection.jsx";
import Toast from "./Toast.jsx";
import s from "./Account.module.css";

const SECTIONS = [
  { id: "profile", label: "Profile" },
  { id: "email", label: "Email" },
  { id: "password", label: "Password" },
  { id: "devices", label: "Devices" },
  { id: "delete", label: "Delete account" },
];
const IDS = SECTIONS.map((section) => section.id);

export default function AccountTab({ username, state, retry }) {
  const [active, go] = useActiveSection(IDS);
  const [toast, setToast] = useState(null);
  const [madePassword, setMadePassword] = useState(false);
  const [devicesRun, setDevicesRun] = useState(0); // a new number reloads the device list
  const say = useCallback((message) => setToast({ id: Date.now(), message }), []);
  const clear = useCallback(() => setToast(null), []);

  if (state.status === "error")
    return <Failed title="Couldn't load your account" message={state.message} onRetry={retry} />;
  if (state.status !== "ready") return <Skel height={420} />;

  const account = state.data;
  const hasPassword = account.password || madePassword;

  return (
    <>
      <div className={s.acct}>
      <AccountNav sections={SECTIONS} active={active} onGo={go} />
      <div className={s.asecs}>
        <ProfileSection username={username} />
        <section className={`${s.card} ${s.sec}`} id="acct-email" aria-labelledby="h-email">
          <h2 id="h-email">Email</h2>
          <EmailSection account={account} say={say} />
        </section>
        <section className={`${s.card} ${s.sec}`} id="acct-password" aria-labelledby="h-password">
          <h2 id="h-password">{hasPassword ? "Password" : "Set a password"}</h2>
          <PasswordSection
            key={hasPassword ? "change" : "set"}
            needsCurrent={hasPassword}
            say={say}
            onChanged={() => {
              setMadePassword(true);
              setDevicesRun((n) => n + 1);
            }}
          />
        </section>
        <section className={`${s.card} ${s.sec}`} id="acct-devices" aria-labelledby="h-devices">
          <h2 id="h-devices">Devices</h2>
          <DevicesSection key={devicesRun} say={say} />
        </section>
        <DeleteSection username={username} />
      </div>
      </div>
      <Toast toast={toast} onDone={clear} />
    </>
  );
}
