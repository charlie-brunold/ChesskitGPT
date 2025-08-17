import { useAtom, useAtomValue } from "jotai";
import {
  gameExplanationsAtom,
  currentPositionAtom,
} from "@/sections/analysis/states";
import { MoveExplanation, GameExplanations } from "@/types/explanation";
import { useCallback, useMemo } from "react";

export function useExplanations() {
  const [gameExplanations, setGameExplanations] = useAtom(gameExplanationsAtom);
  const currentPosition = useAtomValue(currentPositionAtom);

  /**
   * Get explanation for the current move being viewed
   */
  const currentMoveExplanation = useMemo((): MoveExplanation | undefined => {
    if (!gameExplanations?.explanations || !currentPosition?.currentMoveIdx) {
      return undefined;
    }

    return gameExplanations.explanations[currentPosition.currentMoveIdx];
  }, [gameExplanations?.explanations, currentPosition?.currentMoveIdx]);

  /**
   * Get explanation for a specific move number
   */
  const getMoveExplanation = useCallback(
    (moveNumber: number): MoveExplanation | undefined => {
      if (!gameExplanations?.explanations) {
        return undefined;
      }

      return gameExplanations.explanations[moveNumber];
    },
    [gameExplanations?.explanations]
  );

  /**
   * Check if explanations are available for the current game
   */
  const hasExplanations = useMemo((): boolean => {
    return !!(
      gameExplanations?.explanations &&
      Object.keys(gameExplanations.explanations).length > 0
    );
  }, [gameExplanations?.explanations]);

  /**
   * Get count of available explanations
   */
  const explanationCount = useMemo((): number => {
    if (!gameExplanations?.explanations) return 0;
    return Object.keys(gameExplanations.explanations).length;
  }, [gameExplanations?.explanations]);

  /**
   * Clear all explanations for the current game
   */
  const clearExplanations = useCallback(() => {
    setGameExplanations(undefined);
  }, [setGameExplanations]);

  /**
   * Set explanations for a game
   */
  const setExplanations = useCallback(
    (explanations: GameExplanations) => {
      setGameExplanations(explanations);
    },
    [setGameExplanations]
  );

  /**
   * Generate explanation for a single move (placeholder for future implementation)
   */
  const generateMoveExplanation =
    useCallback(async (): Promise<MoveExplanation | null> => {
      // TODO: Implement single move explanation generation
      // This will be used for on-demand explanations in Phase 2
      console.warn("generateMoveExplanation not yet implemented");
      return null;
    }, []);

  return {
    // Current state
    gameExplanations,
    currentMoveExplanation,
    hasExplanations,
    explanationCount,

    // Getters
    getMoveExplanation,

    // Actions
    setExplanations,
    clearExplanations,
    generateMoveExplanation,
  };
}
