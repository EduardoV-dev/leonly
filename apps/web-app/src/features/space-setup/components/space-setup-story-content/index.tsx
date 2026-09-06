import { useTranslation } from "react-i18next";
import type { SpaceSetupSteps } from "../../types/setup-types";
import { screenImages } from "../space-setup-container/constants";
import styles from "../space-setup-container/space-setup.module.css";

type SpaceSetupStoryContentProps = {
  screen: SpaceSetupSteps;
};

export function SpaceSetupStoryContent({ screen }: Readonly<SpaceSetupStoryContentProps>) {
  const { t } = useTranslation("spaceSetup");
  const content = screenImages[screen];

  return (
    <>
      <img src={content.image} alt={t(`story.${screen}.imageAlt`)} className={styles.storyImage} />
      <div className={styles.storyShade} />
      <div className={styles.storyCaption}>
        <p>{t(`story.${screen}.caption`)}</p>
        <span>{t(`story.${screen}.captionDetail`)}</span>
      </div>
    </>
  );
}
