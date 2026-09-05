"use client";

import {
  CalendarDays,
  CircleUserRound,
  Languages,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { APP_ROUTES } from "@/constants/routes";
import { PartnerInviteStatus } from "@/features/partner-invite/components/partner-invite-status";
import type { SettingsReadModel } from "../../server/get-settings-for-current-user";
import { SettingsMemberAvatar } from "./settings-member-avatar";
import styles from "./settings-page.module.css";
import railStyles from "./settings-rail.module.css";
import { SignOutForm } from "./sign-out-form";

type SettingsPageProps = {
  settings: SettingsReadModel;
};

function formatDateOnly(value: string, language: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  return new Intl.DateTimeFormat(language === "es" ? "es-ES" : "en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(date);
}

function formatJoinedDate(value: string, language: string): string {
  return new Intl.DateTimeFormat(language === "es" ? "es-ES" : "en-US", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value));
}

export function SettingsPage({ settings }: Readonly<SettingsPageProps>) {
  const { i18n, t } = useTranslation("settings");
  const language = i18n.resolvedLanguage === "es" ? "es" : "en";
  const currentMember = settings.activeMembers.find((member) => member.isCurrentMember);

  if (!currentMember) {
    throw new Error("Settings requires a current member.");
  }

  const startDate = formatDateOnly(settings.space.startDate, language);
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>
          <Sparkles aria-hidden="true" />
          {t("hero.eyebrow")}
        </p>
        <h1>{t("hero.heading")}</h1>
        <p className={styles.heroDescription}>{t("hero.description")}</p>
      </header>

      <div className={styles.layout}>
        <aside className={styles.rail} aria-label={settings.space.name}>
          <section className={`${styles.card} ${railStyles.summaryCard}`}>
            <div className={railStyles.summaryAvatars}>
              {settings.activeMembers.map((member) => (
                <SettingsMemberAvatar
                  key={member.id}
                  member={member}
                  label={t("members.avatar", { name: member.displayName })}
                />
              ))}
              <span className={railStyles.memberCount} aria-hidden="true">
                {settings.activeMembers.length}
              </span>
            </div>
            <span className={styles.sharedBadge}>{t("shared.ownership")}</span>
            <h2>{settings.space.name}</h2>
            <p className={railStyles.summaryDate}>
              <CalendarDays aria-hidden="true" />
              {t("summary.date", { date: startDate })}
            </p>
            <p className={railStyles.summaryNote}>
              {settings.membershipState === "one-member"
                ? t("summary.oneMember")
                : t("summary.twoMembers")}
            </p>
          </section>

          <PartnerInviteStatus
            code={settings.invite.code}
            expiresAt={settings.invite.expiresAt}
            membershipState={settings.membershipState}
          />

          <section
            className={`${styles.card} ${railStyles.vaultCard}`}
            aria-labelledby="vault-heading"
          >
            <span className={railStyles.iconSeal} aria-hidden="true">
              <LockKeyhole />
            </span>
            <div>
              <h2 id="vault-heading">{t("vault.heading")}</h2>
              <p>{t("vault.description")}</p>
            </div>
            <Link href={APP_ROUTES.VAULT}>
              {t("vault.action")}
              <span aria-hidden="true">→</span>
            </Link>
          </section>
        </aside>

        <div className={styles.primaryColumn}>
          <section className={styles.card} aria-labelledby="shared-settings-heading">
            <div className={styles.sectionHeader}>
              <div>
                <h2 id="shared-settings-heading">{t("shared.heading")}</h2>
                <p>{t("shared.description")}</p>
              </div>
              <span className={styles.sharedBadge}>{t("shared.ownership")}</span>
            </div>
            <dl className={styles.valueList}>
              <div className={styles.valueRow}>
                <dt>
                  <UsersRound aria-hidden="true" />
                  {t("shared.name")}
                </dt>
                <dd>{settings.space.name}</dd>
              </div>
              <div className={styles.valueRow}>
                <dt>
                  <CalendarDays aria-hidden="true" />
                  {t("shared.startDate")}
                </dt>
                <dd>{startDate}</dd>
              </div>
            </dl>
          </section>

          <section className={styles.card} aria-labelledby="members-heading">
            <div className={styles.sectionHeader}>
              <div>
                <h2 id="members-heading">{t("members.heading")}</h2>
                <p>{t("members.description")}</p>
              </div>
            </div>
            <ul className={styles.memberList}>
              {settings.activeMembers.map((member) => (
                <li key={member.id}>
                  <SettingsMemberAvatar
                    member={member}
                    label={t("members.avatar", { name: member.displayName })}
                  />
                  <div className={styles.memberIdentity}>
                    <p>
                      <strong>{member.displayName}</strong>
                      <span
                        className={member.isCurrentMember ? styles.youBadge : styles.partnerBadge}
                      >
                        {member.isCurrentMember ? t("members.you") : t("members.partner")}
                      </span>
                    </p>
                    <span className={styles.memberJoined}>
                      {t("members.joined", {
                        date: formatJoinedDate(member.joinedAt, language),
                      })}
                    </span>
                  </div>
                  <span className={styles.activeStatus}>
                    <span className={styles.statusDot} aria-hidden="true" />
                    {t("members.active")}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.card} aria-labelledby="preferences-heading">
            <div className={styles.sectionHeader}>
              <div>
                <h2 id="preferences-heading">{t("preferences.heading")}</h2>
                <p>{t("preferences.description")}</p>
              </div>
              <span className={styles.personalBadge}>{t("preferences.ownership")}</span>
            </div>
            <dl className={styles.valueList}>
              <div className={styles.valueRow}>
                <dt>
                  <UserRound aria-hidden="true" />
                  {t("preferences.displayName")}
                </dt>
                <dd>
                  <strong>{currentMember.displayName}</strong>
                  <span>{t("preferences.displayNameHelp")}</span>
                </dd>
              </div>
              <div className={styles.valueRow}>
                <dt>
                  <Languages aria-hidden="true" />
                  {t("preferences.language")}
                </dt>
                <dd>
                  <span>{t("preferences.languageHelp")}</span>
                </dd>
              </div>
            </dl>
          </section>

          <section className={styles.card} aria-labelledby="account-heading">
            <div className={styles.sectionHeader}>
              <div>
                <h2 id="account-heading">{t("account.heading")}</h2>
                <p>{t("account.description")}</p>
              </div>
              <ShieldCheck className={styles.sectionIcon} aria-hidden="true" />
            </div>
            <dl className={styles.accountDetails}>
              <div>
                <dt>
                  <Mail aria-hidden="true" />
                  {t("account.email")}
                </dt>
                <dd>{settings.account.email ?? t("account.unavailable")}</dd>
              </div>
              <div>
                <dt>
                  <CircleUserRound aria-hidden="true" />
                  {t("account.provider")}
                </dt>
                <dd>{settings.account.providerLabel ?? t("account.unavailable")}</dd>
              </div>
            </dl>
            <div className={styles.accountAction}>
              <SignOutForm />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
