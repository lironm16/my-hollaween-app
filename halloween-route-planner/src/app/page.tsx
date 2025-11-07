import { HomeExperience } from "@/components/home-experience";
import { mockHouses } from "@/data/mock-houses";

export default function Home() {
  return <HomeExperience initialHouses={mockHouses} />;
}
