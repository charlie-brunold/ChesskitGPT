import { Chess } from "chess.js";
import { GameEval, PositionEval } from "@/types/eval";
import { MoveClassification } from "@/types/enums";
import {
  ExplanationRequest,
  GameExplanations,
  MoveExplanation,
  BatchExplanationProgress,
} from "@/types/explanation";
import { MoveExplainerService } from "./moveExplainer";
import { getPositionWinPercentage } from "../engine/helpers/winPercentage";

export class GameExplanationService {
  private explainerService: MoveExplainerService;

  constructor(apiKey: string) {
    this.explainerService = new MoveExplainerService(apiKey);
  }

  /**
   * Generates explanations for a complete game
   */
  async explainGame(
    gameId: number,
    pgn: string,
    gameEval: GameEval,
    onProgress?: (progress: BatchExplanationProgress) => void
  ): Promise<GameExplanations> {
    // Parse the game to get FENs and UCI moves
    const chess = new Chess();
    chess.loadPgn(pgn);

    const history = chess.history({ verbose: true });
    const fens: string[] = [];
    const uciMoves: string[] = [];

    // Collect all positions
    chess.reset();
    fens.push(chess.fen());

    for (const move of history) {
      chess.move(move);
      fens.push(chess.fen());
      uciMoves.push(move.from + move.to + (move.promotion || ""));
    }

    // Filter moves that should be explained
    const requests = this.buildExplanationRequests(
      fens,
      uciMoves,
      gameEval.positions
    );

    // Generate explanations in batches
    const explanations = await this.explainerService.batchExplainMoves(
      requests,
      onProgress
    );

    // Convert to GameExplanations format
    const explanationMap: Record<number, MoveExplanation> = {};
    for (const explanation of explanations) {
      explanationMap[explanation.moveNumber] = explanation;
    }

    return {
      gameId,
      explanations: explanationMap,
      generatedAt: new Date().toISOString(),
      version: "1.0",
    };
  }

  /**
   * Explains a single move from a game
   */
  async explainSingleMove(
    fen: string,
    uciMove: string,
    moveNumber: number,
    positionEval: PositionEval,
    previousPositionEval?: PositionEval
  ): Promise<MoveExplanation | null> {
    if (!positionEval.moveClassification) {
      return null;
    }

    const previousWinPercentage = previousPositionEval
      ? getPositionWinPercentage(previousPositionEval)
      : 50;
    const currentWinPercentage = getPositionWinPercentage(positionEval);
    const evalChange = Math.abs(currentWinPercentage - previousWinPercentage);

    // Check if this move should be explained
    if (
      !this.explainerService.shouldExplainMove(
        positionEval.moveClassification,
        evalChange
      )
    ) {
      return null;
    }

    const request: ExplanationRequest = {
      fen,
      uciMove,
      moveNumber,
      positionEval,
      previousPositionEval,
      classification: positionEval.moveClassification,
      opening: positionEval.opening,
      previousWinPercentage,
      currentWinPercentage,
      isWhiteMove: moveNumber % 2 === 1,
    };

    return this.explainerService.explainMove(request);
  }

  private buildExplanationRequests(
    fens: string[],
    uciMoves: string[],
    positions: PositionEval[]
  ): ExplanationRequest[] {
    const requests: ExplanationRequest[] = [];

    for (let i = 1; i < positions.length; i++) {
      const position = positions[i];
      const previousPosition = positions[i - 1];

      if (!position.moveClassification) continue;

      const previousWinPercentage = getPositionWinPercentage(previousPosition);
      const currentWinPercentage = getPositionWinPercentage(position);
      const evalChange = Math.abs(currentWinPercentage - previousWinPercentage);

      // Check if this move should be explained
      if (
        this.explainerService.shouldExplainMove(
          position.moveClassification,
          evalChange
        )
      ) {
        requests.push({
          fen: fens[i - 1], // Position before the move
          uciMove: uciMoves[i - 1],
          moveNumber: i,
          positionEval: position,
          previousPositionEval: previousPosition,
          classification: position.moveClassification,
          opening: position.opening,
          previousWinPercentage,
          currentWinPercentage,
          isWhiteMove: i % 2 === 1,
        });
      }
    }

    return requests;
  }

  /**
   * Gets statistics about which moves would be explained
   */
  getExplanationStats(gameEval: GameEval): {
    totalMoves: number;
    movesToExplain: number;
    byClassification: Record<MoveClassification, number>;
  } {
    const stats = {
      totalMoves: gameEval.positions.length - 1,
      movesToExplain: 0,
      byClassification: {} as Record<MoveClassification, number>,
    };

    for (let i = 1; i < gameEval.positions.length; i++) {
      const position = gameEval.positions[i];
      const previousPosition = gameEval.positions[i - 1];

      if (!position.moveClassification) continue;

      const classification = position.moveClassification;
      stats.byClassification[classification] =
        (stats.byClassification[classification] || 0) + 1;

      const previousWinPercentage = getPositionWinPercentage(previousPosition);
      const currentWinPercentage = getPositionWinPercentage(position);
      const evalChange = Math.abs(currentWinPercentage - previousWinPercentage);

      if (this.explainerService.shouldExplainMove(classification, evalChange)) {
        stats.movesToExplain++;
      }
    }

    return stats;
  }
}
