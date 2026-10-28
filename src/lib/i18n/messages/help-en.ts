import type { AppMessages } from "@/lib/i18n/messages/he";

/** FAQ / help copy (English). Same keys as Hebrew help tree. */
export const helpMessagesEn: AppMessages["help"] = {
  shell: {
    back: "Back",
    backToHome: "Back to home",
    backToMap: "Map",
  },
  product: {
    nightPassBannerCta: "I have an entry code",
    nightPassRevealHint: "Home addresses appear on reveal day.",
    gemGameTitle: "Imp hunt",
    gemAlbumTitle: "Imp collection",
    gemPlaceAction: "Imp location",
    gemPlaceHint: "Place the imp outdoors — in a public spot everyone can reach, not inside a building.",
    gemPlaceSave: "Save location",
    gemFoundCheer: "You found an imp",
    gemFoundI: "Found",
    gemNotFoundI: "Not found yet",
  },
  index: {
    title: "FAQ",
    links: {
      contact: "Personal help — contact form",
      addHouse: "How do I add a house?",
      eventDeviceOwner: "Edit code & devices — homeowners",
      eventDeviceVisitor: "Connect a device — edit code (6 digits)",
      install: "How do I install the app?",
      filter: "How do I filter houses?",
      createRoute: "How do I build a route?",
      duringRoute: "During the route",
      scanVisit: "How do I scan a visit QR?",
      shareEditCode: "How do I share an edit code?",
      editCode: "I lost my edit code",
      gemHunt: "Imp hunt",
      gemPlaceDemon: "Imp location — homeowners",
    },
  },
  addHouse: {
    title: "How do I add a house?",
    ctaForm: "Go to add-house form",
    linkShareCode: "How do I share an edit code?",
    linkLostCode: "Lost your edit code?",
    steps: [
      {
        title: "Open Add",
        body: "Menu ☰ → House → Add.",
        imageAlt: "Menu with Add button",
      },
      {
        title: "Name & address",
        body: "House name and a real address from the list.",
        imageAlt: "Name and address on the form",
      },
      {
        title: "Hours, treats, scare",
        body: "Hours on Oct 31, scare level, and treats — at least decor or candy.",
        imageAlt: "Hours, treats, and scare level",
      },
      {
        title: "Save & code",
        body: "Tap Save. You get a 6-digit edit code to update the house (hours, treats, photo). On the device where you added it, the code is saved — you can edit without typing it again. Share the edit code to let someone else edit — after they enter it once, it’s saved on their device too.",
        imageAlt: "Success screen with edit code",
      },
    ],
  },
  filter: {
    title: "How do I filter houses?",
    intro:
      "Filters narrow the list and route to houses that fit you — but the map still shows everyone so you don’t lose context.",
    linkCreateRoute: "Next: How do I build a route?",
    steps: [
      {
        title: "Open filters",
        body: "In the toolbar, tap the filter button (funnel icon). A sheet opens with hours, scare level, treats, accessibility, neighborhood, and your marks (liked / not visited / skipped).",
        imageAlt: "House filter sheet",
      },
      {
        title: "What happens on the map?",
        body: "Houses that **pass** the filter show in normal orange on the list, route, and map. Houses that **don’t pass** **stay on the map** but look **dimmed (gray)**. You can still tap them for details. To bring them back: open filters, change criteria (or reset), then Show results.",
        imageAlt: "Filtered-out houses dimmed on the map",
      },
      {
        title: "Custom hours",
        body: "Under **Hours** you have three options:\n**Any time** — all houses, no hour limit.\n**Open now** — only houses open right now.\n**Custom** — pick a time window (e.g. from 6:30 PM). Important: the filter checks who **will be open** at your chosen time, not who is open *now*. Example: at 5 PM you’ll still see a house that opens at 7 PM — because you’ll arrive while it’s open. Houses that already closed before your chosen time won’t appear.",
        imageAlt: "Custom hours selection",
      },
      {
        title: "Show results",
        body: "After choosing criteria, tap Show results (count) at the bottom. The number is how many houses pass. The list and route show **only** those — others stay gray on the map. The filter button in the toolbar turns orange when a filter is active.",
        imageAlt: "Filter results in the list",
      },
    ],
  },
  createRoute: {
    title: "How do I build a route?",
    intro:
      "The app builds a visit order from your filters, start point, and walking distance. You don’t pick every house by hand.",
    linkFilterGuide: "Full guide: How do I filter?",
    linkDuringRoute: "Next: During the route",
    steps: [
      {
        title: "Filter (optional)",
        body: "Before the route you can filter by scare, treats, accessibility, neighborhood, and more — filter button in the toolbar. Only houses that pass enter the route. Houses you already marked **visited** are excluded. Houses that fail the filter **stay gray on the map** — change the filter to include them.",
        imageAlt: "House filter sheet",
      },
      {
        title: "Start point",
        body: "Tap 📍 in the toolbar and choose where you start: current location (GPS), neighborhood center, or a point on the map. The route is calculated from there.",
        imageAlt: "Choosing a start point",
      },
      {
        title: "Turn route on",
        body: "Tap the route button (trail icon) in the toolbar. It lights up orange — route mode is on. If you chose GPS and location isn’t ready yet, you’ll be asked to allow location access.",
        imageAlt: "Enabling route from the toolbar",
      },
      {
        title: "View the route",
        body: "On the map: an orange line connects stops in order. In the list: a summary (houses, stops, distance, estimated time) then numbered stops with walking distance between each.",
        imageAlt: "Route summary and stop list",
      },
    ],
  },
  duringRoute: {
    title: "During the route",
    intro: "Once the route is on — follow the order, mark visits, and skip houses that don’t fit.",
    linkCreate: "Haven’t built a route yet? Creation guide",
    steps: [
      {
        title: "Map or list",
        body: "During the route you can switch map/list in the toolbar. The list shows exact order and walk distance to each stop. On the map — the orange line and all houses.",
        imageAlt: "Switching map and list in route mode",
      },
      {
        title: "Follow the line",
        body: "On the map, the orange line is walk order. The summary button (house count) shows total distance, estimated time, and how many you skipped.",
        imageAlt: "Route line on the map",
      },
      {
        title: "Visit, skip, details",
        body: "At each house: tap the card for full details. In the ⋮ menu you can mark visited, skip (temporary or permanent), or open Google Maps directions. A skipped house appears separately — you can bring it back into the route.",
        imageAlt: "Visit and skip actions on the route",
      },
      {
        title: "Change start & exit",
        body: "At the top of the list: change to another start point — the route recalculates. To finish: tap the route button again (while it’s lit) to leave route mode.",
        imageAlt: "Change start and exit route",
      },
    ],
  },
  editCode: {
    title: "I lost my edit code",
    p1: "There is no automatic edit-code recovery in the app.",
    p2Before: "If it’s completely lost and no device has access — contact the ",
    p2Strong: "app organizer",
    p2After: " to get the code again.",
    imageAlt: "Success screen with edit code",
  },
  shareEditCode: {
    title: "How do I share an edit code?",
    intro:
      "An edit code lets someone else update your house. Fast path: house card → ⋮ → Edit code.",
    steps: [
      {
        title: "Open the actions menu (⋮)",
        body: "On the map or list, open the house card. Tap **⋮** (three dots) at the top of the card.",
      },
      {
        title: "Choose **Edit code**",
        body: "In the menu, choose **Edit code**. Shown only to homeowners or admins.",
      },
      {
        title: "Copy or share",
        body: "A dialog shows the 6-digit code. Tap **Copy** or **Share** to send via WhatsApp / message. The recipient enters it once under: Menu → House → Edit → pick the house → **Unlock to edit**.",
        imageAlt: "Edit code dialog with copy and share",
      },
    ],
  },
  scanVisit: {
    title: "Scan a visit QR",
    visitorHeading: "How do visitors scan?",
    visitorFootnote:
      "Scanned the same house again? It stays **visited** — scanning doesn’t undo a visit.",
    visitorSteps: [
      "A visit sheet with a QR code hangs by the door.",
      "On iPhone with the app on the home screen: Menu → Houses → Scan QR — scanning stays inside the app.",
      "You can also use the phone camera and open the link (on iPhone that’s usually Safari, not the home-screen icon). On Android you can use Google Lens too.",
      "The map opens on that house and marks it visited — same as using the menu. Works without installing the app.",
    ],
    ownerHeading: "Homeowners — how to print?",
    ownerSteps: [
      "Open your house on the map or list.",
      "Tap Actions and choose Show visit sheet.",
      "Tap Print and hang the sheet by the door.",
      "In Safari on iPhone you may see a message about blocking automatic printing — tap Allow to open the print dialog normally.",
    ],
    safariBlockTitle: "Message in Safari on iPhone?",
    safariBlockBody:
      "If you see **This website has been blocked from automatically printing**, tap **Allow**. It’s a normal Apple safety prompt for print windows from websites.",
    safariMacTitle: "Safari on Mac?",
    safariMacBody:
      "In the print dialog: turn off **Headers and Footers**, enable **Print backgrounds**, and make sure scale is 100%.",
  },
  install: {
    title: "How do I install the app?",
    intro: "Install = Add to Home Screen.",
    iphoneSectionTitle: "iPhone",
    iphoneSectionSubtitle: "Safari only",
    androidSectionTitle: "Android",
    androidSectionSubtitle: "Chrome recommended",
    playProtectTitle: "Google Play Protect blocking?",
    playProtectSubtitle: "Fix",
    playProtectTip1:
      "**Already installed and Google blocks?** Remove HallowHood from **Settings → Apps** and try again from **Download**.",
    playProtectTip2:
      "Google may show **Unsafe app blocked**. Tap **More details**, then **Got it**.",
    playProtectImageAlt: "Google Play Protect — unsafe app blocked",
    iphoneSteps: [
      {
        title: "Tap Share",
        body: "In Safari, bottom bar — Share button (arrow up from a square).",
        imageAlt: "Share button in Safari",
      },
      {
        title: "Add to Home Screen",
        body: "Scroll and choose **Add to Home Screen** in the share sheet.",
        imageAlt: "Add to Home Screen in the share menu",
      },
      {
        title: "Confirm",
        body: "Tap **Add** (top right). The icon appears on your home screen.",
        imageAlt: "Confirm Add to Home Screen",
      },
    ],
    androidSteps: [
      {
        title: "Install the app",
        body: "In **Chrome** — tap **Download** at the top and confirm.",
        imageAlt: "Install app button in Chrome",
      },
    ],
  },
  eventDeviceOwner: {
    title: "Edit code & devices — homeowners",
    callout: "Up to 4 devices per house — all share the same family code ({codeLength} digits).",
    linkVisitor: "Guide for family & guests — connect a device",
    steps: [
      {
        title: "One code — edit & connect",
        body: "The edit code ({codeLength} digits) is also the device connection code. Entering it registers the device, allows editing the house (owner or editor), and shows full addresses on reveal day.",
        imageAlt: "Edit code and devices dialog with 6-digit code",
      },
      {
        title: "Where to open it?",
        body: "After adding a house: on the success screen tap «Edit code & devices». Anytime: house card → ⋮ → «Edit code & devices».",
        imageAlt: "Actions menu with edit code and devices",
      },
      {
        title: "Share & track",
        body: "«Copy» — send the code (WhatsApp / SMS). You can also share an invite link from the dialog. Below: name, phone, and role (homeowner / editor) per device. «New entry code» / reset — disconnects all devices and requires an updated code.",
        imageAlt: "Connected devices list under the code",
      },
      {
        title: "Homeowners — connect to the event",
        body: "On the device where you added the house you can use «Connect to event (homeowner)» at the top of the map or «Connect to event» in menu ☰ — no code needed. Editors and guests use the same edit code ({codeLength} digits) or an invite link.",
        imageAlt: "Connect-to-event banner for homeowners",
      },
    ],
  },
  eventDeviceVisitor: {
    title: "Connect a device — family & guests",
    callout:
      "Edit code ({codeLength} digits) from the homeowners = device registration + access to addresses and visit details.",
    linkOwner: "Homeowners — share code & devices",
    steps: [
      {
        title: "Which code do you get?",
        body: "From the homeowners: a {codeLength}-digit edit code — the same code used to edit the house. Or an invite link (no typing digits).",
      },
      {
        title: "«{bannerCta}» on the map",
        body: "If the device isn’t connected yet, a banner appears at the top. Tap «{bannerCta}», enter the edit code ({codeLength} digits) + name + phone, then «Register».",
        imageAlt: "I have an entry code banner on the map",
      },
      {
        title: "Connect from the menu too",
        body: "Open ☰. At the top: «Device not connected» and tap «Connect to event» — same registration form (code, name, phone).",
        imageAlt: "Side menu with connect-to-event area",
      },
      {
        title: "Registration form",
        body: "After «Register» the dialog closes and the map updates. One code works on one device at a time — registering elsewhere disconnects the previous device. «Disconnect» in the menu only releases this device; the code stays valid.",
        imageAlt: "Registration form with 6-digit entry code",
      },
      {
        title: "After connecting",
        body: "In ☰ you’ll see «Device connected» and the name you entered. {revealHint}",
        imageAlt: "Menu with connected device",
      },
    ],
  },
  gemHunt: {
    closedMessage: "The hunt isn’t open to everyone yet.",
    backToFaq: "Back to FAQ",
    aboutTitle: "About the game",
    aboutBody: [
      "**Imp hunt** is a small Purim-night scavenger hunt: near neighborhood houses hides a **virtual creature** — find it **in the camera**, tap it, and it joins your personal **imp collection** (menu ☰).",
      "You can hunt only at houses **whose address is visible to you** — like on the map: your house, businesses and public places, and neighbors’ houses **after** address reveal time. No address — no imp.",
      "Each house has a **different character**. **19 characters** total across houses — the more you find, the fuller your collection.",
      "**Homeowners:** make sure the imp sits in a good spot (sidewalk / yard, outdoors). Off? **Actions** → **Imp location** — practice a few times before the evening.",
    ],
    whereTitle: "Where do you see imps?",
    whereItems: [
      "On the map — imp markers on houses (after you turn on imps in the toolbar). On Purim night when the hunt is live, a hidden-imp button appears when you’re near a house.",
      "On the house card — hidden imp block with distance and open camera in range (iPhone ~5 m, Android ~15 m from the sidewalk point).",
      "In filters — filter {notFoundI} / {foundI}. Under My marks there’s a {foundI} tab.",
    ],
    startTitle: "How do you start a hunt?",
    startSteps: [
      "Get near a house — refresh location (GPS) if needed.",
      "Open the camera from the house card or the hunt button on the map. iPhone — Safari; Android — Chrome.",
      "Allow location and compass when the browser asks — the hint arrow needs direction.",
      "Pan the camera — the imp locks in the world near the sidewalk (close range, up to ~15 m, so it doesn’t blend with a neighbor).",
    ],
    hintTitle: "Hints & **Show me**",
    hintParagraphs: [
      "Hint · steer me — compass arrow (straight line to the imp), distance, left/right, and a Google Maps walking link for street routing.",
      "Show me — shows the creature centered without hunting with the camera (useful without camera permission or when aiming is hard). Hide returns to normal hunt mode. You must be in hunt range (button highlighted green); out of range — error in the hint bar.",
      "After Show me, tapping Hint cancels screen centering — to return to navigation.",
    ],
    foundTitle: "Finding & {albumTitle}",
    foundParagraphs: [
      "When the creature is in frame — tap it (or rotate in encounter mode then tap). After {foundCheer} you can open {albumTitle} from the menu.",
      "Each house with an imp adds to the collection — see who’s found and who’s still waiting in the neighborhood.",
    ],
    openAlbum: "Open {albumTitle}",
    troubleshootingTitle: "Common issues",
    troubleshootingItems: [
      "**Jumping distance** — wait for GPS to settle; stand outside with open sky.",
      "**No camera** — you can hunt with Show me only.",
      "**Arrow won’t move (Safari)** — tap allow direction in the footer and confirm in iOS.",
      "**Neighbor’s imp** — the sidewalk point is range-limited; if calibration is needed — admin tools on the house card.",
    ],
    linkPlaceDemon: "Imp location — homeowners (photo guide)",
  },
  gemPlaceDemon: {
    title: "{placeAction} — homeowners",
    intro:
      "This sets **where** on the sidewalk/yard the imp appears in the camera — before you open {gameTitle} to the public.",
    linkEventDevice: "Edit code & devices",
    steps: [
      {
        title: "Open {placeAction}",
        body: "**Homeowner** (edit code on device) or **admin**. Home or **On my device** → **Actions** (⋮) → **{placeAction}**. Saves to the server for all visitors.",
        imageAlt: "Actions menu with imp location",
      },
      {
        title: "Outdoors, reachable",
        body: "{placeHint}",
        imageAlt: "Imp location map with center pin",
      },
      {
        title: "Save & reset",
        body: "Drag the pin on the map, use arrows or **My location** (stand at the desired outdoor spot). Tap **{placeSave}** — everyone sees the new point. **Reset** returns to the automatic spot near the house.",
        imageAlt: "Save and reset buttons under the map",
      },
    ],
  },
  contact: {
    title: "Personal help",
  },
  contactForm: {
    intro: "Something not working? We’re happy to help. Leave details — phone is optional.",
    nameLabel: "Name *",
    phoneLabel: "Phone — if we should call back",
    roleLegend: "Who are you? *",
    platformLegend: "Which device? *",
    topicLegend: "Topic",
    topicPlaceholder: "Choose…",
    houseLabel: "House name or address",
    messageLabel: "What happened / what do you need? *",
    messagePlaceholder: "e.g. empty map, can’t install, edit code doesn’t work…",
    photoLabel: "Screenshot",
    photoHint: "Image is stored on the server temporarily for ~72 hours.",
    photoRemoveAria: "Remove image",
    photoAdd: "Add screenshot",
    submit: "Send",
    submitting: "Sending…",
    successTitle: "We got your message",
    successBack: "Back to home",
    errorPickRole: "Please choose who you are.",
    errorPickPlatform: "Please choose a device.",
    errorUpload: "Image upload failed",
    errorSubmit: "Couldn’t send.",
    errorOffline: "No server connection. Check network and try again.",
    role: {
      owner: "Homeowner",
      visitor: "Visitor",
      other: "Other",
    },
    platform: {
      android: "Android",
      iphone: "iPhone",
      computer: "Computer",
      other: "Other",
    },
    topic: {
      bug: "Bug / issue",
      add_house: "Adding a house",
      map_route: "Map / route",
      install: "Home screen install",
      edit_code: "Edit code",
      other: "Something else",
    },
  },
  statsRedirect: "Opening live stats…",
};
