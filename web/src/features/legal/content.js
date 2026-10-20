// The words of the Privacy and Terms pages. Plain language, short on purpose.
// A body item is a paragraph (string) or { list: [...] }. "{contact}" becomes a link to the Contact page.
export const UPDATED = "20 October 2026";

export const PRIVACY = {
  title: "Privacy",
  lead: "What Boip keeps about you, why, and what you can ask us to do about it.",
  sections: [
    {
      heading: "Who we are",
      body: ["Boip is run by Aditya Lour, in India. To reach us, use the {contact}."],
    },
    {
      heading: "What we keep",
      body: [
        {
          list: [
            "Your account: your email address and username, and a password that we store in a form we cannot read. If you sign in with Google, we get your Google email address and ID. We never see your Google password.",
            "Your play: your duels and results, your rating, the problems you solve in Practice and the code you submit, and your daily challenge streak.",
            "Your sign-ins: which browsers and devices are signed in to your account, so you can see them and sign them out.",
          ],
        },
        "We may also look at your IP address briefly to stop abuse, such as repeated sign-in attempts.",
      ],
    },
    {
      heading: "How we use it",
      body: [
        "To run Boip: sign you in, match you with rivals, judge your code, rate duels, and show the leaderboard. To send you the emails the account needs, such as verifying your address or resetting a password. To keep the service fair and safe.",
        "We do not sell your data and we do not show ads.",
      ],
    },
    {
      heading: "What other players see",
      body: [
        "Your username, rating and results are visible to other players, for example on the leaderboard and in duels. Your email address is not.",
      ],
    },
    {
      heading: "Who else handles your data",
      body: [
        "Google, if you choose to sign in with Google. Resend, which sends our emails and so sees your email address and the message. Our hosting providers, who store data for us. They only handle it on our behalf.",
      ],
    },
    {
      heading: "Cookies and storage",
      body: [
        "Boip uses a cookie to keep you signed in. It is needed for the site to work. We do not use advertising or tracking cookies.",
        "Your browser also keeps a few things on your own device, such as your saved code drafts and your language choice.",
      ],
    },
    {
      heading: "Keeping and deleting",
      body: [
        "We keep your data while your account exists. To have your account deleted, ask through the {contact}. We will delete your personal details or make them anonymous. Some game records may stay, without anything that identifies you.",
      ],
    },
    {
      heading: "Your choices",
      body: [
        "You can change your email and password in your account settings. You can ask to see, correct or delete what we hold about you through the {contact}.",
      ],
    },
    {
      heading: "Age",
      body: ["Boip is for people aged 13 and over."],
    },
    {
      heading: "Changes",
      body: [
        "If we change this page we will update the date above. For a big change, we will also tell you in the app or by email.",
      ],
    },
  ],
};

export const TERMS = {
  title: "Terms",
  lead: "The rules for using Boip. By using it, you agree to them.",
  sections: [
    {
      heading: "Using Boip",
      body: [
        "You must be 13 or older. Give us true details when you sign up, keep your password safe, and keep to one account each. You are responsible for what happens on your account. If you think someone else has got into it, tell us through the {contact}.",
      ],
    },
    {
      heading: "Play fair",
      body: [
        "Boip only works if duels are honest. Please do not:",
        {
          list: [
            "get help from other people or copy solutions during a duel",
            "use bots or scripts to play, or to send requests faster than a person could",
            "try to break, overload or get around the service, or to read other people's accounts or data",
            "copy or collect our problems and tests to share or sell",
            "pick a username that is abusive or pretends to be someone else",
          ],
        },
        "If you break these rules we may remove results, correct ratings, or suspend or close your account.",
      ],
    },
    {
      heading: "Your code",
      body: [
        "The code you submit stays yours. You let us store it, run it and show it to you, as needed to run Boip. The site, its problems and its design belong to Boip. You may use them to play, but not copy them.",
      ],
    },
    {
      heading: "Ratings and the leaderboard",
      body: [
        "Ratings and rankings are for fun. We may fix, adjust or reset them, for example after a bug or when we find cheating.",
      ],
    },
    {
      heading: "The service",
      body: [
        "Boip is provided as it is. It may be slow, down for a while, or change. We may add, change or remove features, and we do not promise it will always be available or free of mistakes.",
      ],
    },
    {
      heading: "Ending your use",
      body: [
        "You can stop using Boip at any time, and ask us to delete your account through the {contact}. We may suspend or close accounts that break these terms.",
      ],
    },
    {
      heading: "Liability",
      body: [
        "As far as the law allows, Boip and its owner are not liable for losses that come from using the service, such as lost progress or a lost duel. Nothing here limits rights you have by law.",
      ],
    },
    {
      heading: "Law",
      body: ["These terms follow the laws of India."],
    },
    {
      heading: "Changes",
      body: [
        "We may update these terms. The date above shows the latest version. If you keep using Boip after a change, you accept the new terms.",
      ],
    },
  ],
};

export const CONTACT = {
  title: "Contact",
  lead: "Questions, bugs, feedback, or a request about your data or account.",
};

// Splits "…the {contact}." into text and the link marker, so the page can render a real link.
export function splitContact(text) {
  return text.split(/(\{contact\})/).filter((part) => part !== "");
}
