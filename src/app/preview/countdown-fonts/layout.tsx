import { Creepster, Rubik, Rubik_Wet_Paint } from "next/font/google";

const rubik = Rubik({ subsets: ["hebrew", "latin"], weight: ["800"], variable: "--font-rubik-preview" });
const creepster = Creepster({ subsets: ["latin"], weight: "400", variable: "--font-creepster-preview" });
const rubikWetPaint = Rubik_Wet_Paint({
  subsets: ["hebrew", "latin"],
  weight: "400",
  variable: "--font-rubik-wet-paint",
});

export default function CountdownFontsPreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${rubik.variable} ${creepster.variable} ${rubikWetPaint.variable}`}>{children}</div>
  );
}
