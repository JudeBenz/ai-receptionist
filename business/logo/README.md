# AfterRing logo files

Colours: navy `#14213D`, cream `#F7F6F2`, orange `#E07A1F` (same as `site/index.html`).

| File | Use |
|------|-----|
| `afterring-avatar-navy-1024.png` | Profile photo everywhere (static). |
| `afterring-avatar-cream-1024.png` | Light variant for dark backgrounds. |
| `afterring-avatar-navy-400.png` | Small static copy. |
| `afterring-avatar-animated-512.gif` | Google Account profile photo: the dot pulses once per loop. Frame 1 is the static logo, so anywhere that shows only a still looks right. |
| `afterring-avatar-animated-256.gif` | Same, smaller, if an upload rejects the 512 one. |
| `afterring-banner-1500x500.png` | LinkedIn and Google Business Profile cover. |
| `afterring-mark.svg` | Scalable source of the mark. |

## Animated profile photo (what actually works)

- Upload the GIF at myaccount.google.com, Personal info, Profile picture, Upload from device. Use that page, not Gmail settings and not a Workspace admin upload (admin uploads accept only JPEG/PNG and override the user photo).
- Gmail on the web shows the animation in the inbox sender icon and the profile card for recipients who already know the sender; new recipients sometimes get a static or default avatar first. Mobile apps and Outlook/Apple Mail show a still or their own avatar. Google does not promise playback.
- It can take a few days to propagate. Test from a second Gmail account that has no saved contact for the sender.
- BIMI (the logo next to brand emails) is a separate thing: it needs DMARC at enforcement, a static SVG, and for Gmail a Verified Mark Certificate (about $1,000 to $1,500 a year plus a registered trademark). Animation is not allowed there.
- Animated GIFs do play inside an email signature in Gmail and Apple Mail; Outlook desktop shows the first frame.
