import { useCallback, useEffect, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import {
  gameAtom,
  gameEvalAtom,
  gameExplanationsAtom,
} from "@/sections/analysis/states";
import { GameExplanationService } from "@/lib/llm/gameExplanationService";
import { BatchExplanationProgress } from "@/types/explanation";
import { useGameDatabase } from "./useGameDatabase";

export function useGameExplanations() {
  const game = useAtomValue(gameAtom);
  const gameEval = useAtomValue(gameEvalAtom);
  const [gameExplanations, setGameExplanations] = useAtom(gameExplanationsAtom);
  const { gameFromUrl } = useGameDatabase();

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<BatchExplanationProgress | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  /**
   * Generate explanations for the current game
   */
  const generateExplanations = useCallback(
    async (apiKey?: string) => {
      if (!gameEval || !game.pgn() || isGenerating) {
        return;
      }

      // Use API key from parameter or environment
      const key = apiKey || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
      if (!key) {
        setError(
          "OpenAI API key not found. Please set NEXT_PUBLIC_OPENAI_API_KEY in your environment or pass it as a parameter."
        );
        return;
      }

      try {
        setIsGenerating(true);
        setError(null);
        setProgress({ total: 0, completed: 0, errors: [] });

        const explanationService = new GameExplanationService(key);

        // Get stats about what moves will be explained
        const stats = explanationService.getExplanationStats(gameEval);
        console.log(
          `Will explain ${stats.movesToExplain} out of ${stats.totalMoves} moves`
        );

        const gameId = gameFromUrl?.id || Date.now(); // Use database ID or timestamp

        const explanations = await explanationService.explainGame(
          gameId,
          game.pgn(),
          gameEval,
          (progressUpdate) => {
            setProgress(progressUpdate);
          }
        );

        setGameExplanations(explanations);
        console.log(
          `Generated ${Object.keys(explanations.explanations).length} explanations`
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to generate explanations";
        setError(errorMessage);
        console.error("Explanation generation failed:", err);
      } finally {
        setIsGenerating(false);
        setProgress(null);
      }
    },
    [gameEval, game, gameFromUrl?.id, isGenerating, setGameExplanations]
  );

  /**
   * Clear current explanations
   */
  const clearExplanations = useCallback(() => {
    setGameExplanations(undefined);
    setError(null);
  }, [setGameExplanations]);

  /**
   * Auto-clear explanations when game changes
   */
  useEffect(() => {
    clearExplanations();
  }, [game.pgn(), clearExplanations]);

  /**
   * Check if explanations should be generated automatically
   */
  const shouldAutoGenerate = !gameExplanations && !isGenerating && !!gameEval;

  return {
    // State
    gameExplanations,
    isGenerating,
    progress,
    error,
    shouldAutoGenerate,

    // Actions
    generateExplanations,
    clearExplanations,
  };
}
