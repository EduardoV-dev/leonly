"use client";

import { Heart, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MemoriesTimeline } from "@/features/memories/components/memories-timeline";
import { PartnerInviteStatus } from "@/features/partner-invite/components/partner-invite-status";
import { useDashboardActiveSpace } from "../dashboard-shell";
import { MemberAvatar } from "../member-avatar";
import styles from "./dashboard-content.module.css";
import { RelationshipMilestone } from "./relationship-milestone";

export function DashboardContent() {
  const { t } = useTranslation("dashboard");
  const activeSpace = useDashboardActiveSpace();
  const memberNames = activeSpace.active_members.map((member) => member.display_name).join(" & ");
  const isWaitingForPartner = activeSpace.active_members.length === 1;

  return (
    <section className={styles.content} id="timeline">
      <header className={styles.welcome}>
        <p>{t("content.welcome", { names: memberNames })}</p>
        <span>{t("content.welcomeDescription")}</span>
      </header>

      {isWaitingForPartner ? (
        <div className={styles.inviteSection}>
          <PartnerInviteStatus
            code={activeSpace.invite_code}
            expiresAt={activeSpace.invite_code_expires_at}
            membershipState="one-member"
          />
        </div>
      ) : null}

      <div className={styles.heroGrid}>
        <section className={styles.milestoneCard} aria-label={t("content.milestone")}>
          <span className={styles.eyebrow}>
            <Heart aria-hidden="true" /> {t("content.milestoneReached")}
          </span>
          <RelationshipMilestone startDate={activeSpace.start_date} />
        </section>
        <section className={styles.memberSummary} aria-label={t("content.memberSummary")}>
          <div className={styles.avatars}>
            {activeSpace.active_members.map((member) => (
              <MemberAvatar key={member.display_name} member={member} size="medium" />
            ))}
          </div>
          <h2>{isWaitingForPartner ? t("content.waiting") : memberNames}</h2>
          <p>
            {isWaitingForPartner
              ? t("content.waitingDescription")
              : t("content.sharing", { name: activeSpace.name })}
          </p>
        </section>
      </div>

      <section className={styles.summarySection} id="gallery">
        <h2>{t("content.recentMemories")}</h2>
        <MemoriesTimeline variant="recent" />
      </section>

      <section className={styles.summarySection} id="rankings">
        <h2>{t("content.placesHeading")}</h2>
        <div className={styles.emptyState}>
          <MapPin aria-hidden="true" />
          <h3>{t("content.emptyPlaces")}</h3>
          <p>{t("content.emptyPlacesDescription")}</p>
        </div>
      </section>
    </section>
  );
}
