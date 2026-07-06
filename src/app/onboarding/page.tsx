import { Suspense } from "react";
import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "Set up your business — AgriFlow" };

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingForm />
    </Suspense>
  );
}
