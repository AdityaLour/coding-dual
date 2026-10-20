import { useParams } from "react-router";
import SolveScreen from "./SolveScreen.jsx";

export default function SolvePage() {
  const { slug } = useParams();
  return <SolveScreen slug={slug} />;
}
