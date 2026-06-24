import { APP_ROUTES } from "@/constants/routes";
import { redirect } from "next/navigation";

export default function HomePage() {
  redirect(APP_ROUTES.WELCOME_CREATE_STEP("start"));
}
