import { PageContainer } from "@/components/PageContainer";
import { AchievementsClient } from "@/features/achievements/AchievementsClient";

export const metadata = {
  title: "Achievements · Book Tracker",
};

export default function AchievementsPage() {
  return (
    <PageContainer>
      <AchievementsClient />
    </PageContainer>
  );
}
