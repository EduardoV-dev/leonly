import { motion, type Variants } from "motion/react";
import { cardEntryVariants, memoryCards, reducedMotionVariants, staggerDelays } from "../constants";
import styles from "./memory-card-stage.module.css";

type MemoryCardStageProps = {
  entranceVariants: Variants;
  shouldReduceMotion: boolean;
  t: (key: string) => string;
};

export function MemoryCardStage({ entranceVariants, shouldReduceMotion, t }: MemoryCardStageProps) {
  const cardVariants = shouldReduceMotion ? reducedMotionVariants : cardEntryVariants;

  return (
    <motion.div
      variants={entranceVariants}
      custom={staggerDelays.cardStage}
      className={styles.root}
    >
      {memoryCards.map((card) => (
        <div
          key={card.id}
          className={`${styles.cardFrame} ${styles[card.positionClassName]} ${card.widthClassName}`}
        >
          <motion.div variants={cardVariants} custom={card.entryDelay}>
            <div className={styles.cardTilt}>
              <motion.figure
                animate={shouldReduceMotion ? undefined : { y: [0, card.floatY, 0] }}
                transition={
                  shouldReduceMotion
                    ? undefined
                    : {
                        delay: card.floatDelay ?? 0,
                        duration: card.floatDuration,
                        ease: "easeInOut",
                        repeat: Number.POSITIVE_INFINITY,
                      }
                }
                className={styles.card}
              >
                <img
                  src={card.src}
                  alt={t(card.altKey)}
                  loading="lazy"
                  className={styles.cardImage}
                />
              </motion.figure>
            </div>
          </motion.div>
        </div>
      ))}
    </motion.div>
  );
}
