import { Chess } from "chess.js";
import { MoveClassification } from "@/types/enums";
import {
  ExplanationRequest,
  MoveExplanation,
  BatchExplanationProgress,
  ExplanationSettings,
} from "@/types/explanation";

const DEFAULT_SETTINGS: ExplanationSettings = {
  maxLength: 150,
  explainExcellent: false,
  explainOpening: false,
  minEvalChange: 5, // 5% win probability change
};

export class MoveExplainerService {
  private apiKey: string;
  private settings: ExplanationSettings;
  private baseUrl = "https://api.openai.com/v1/chat/completions";

  constructor(apiKey: string, settings: Partial<ExplanationSettings> = {}) {
    this.apiKey = apiKey;
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
  }

  /**
   * Determines which moves should be explained based on classification and settings
   */
  shouldExplainMove(
    classification: MoveClassification,
    evalChange: number
  ): boolean {
    // Always explain poor moves
    if (
      [
        MoveClassification.Blunder,
        MoveClassification.Mistake,
        MoveClassification.Inaccuracy,
      ].includes(classification)
    ) {
      return true;
    }

    // Always explain brilliant moves
    if (
      [MoveClassification.Perfect, MoveClassification.Splendid].includes(
        classification
      )
    ) {
      return true;
    }

    // Explain best moves only if enabled
    if (classification === MoveClassification.Best) {
      return true;
    }

    // Explain excellent moves if setting enabled
    if (
      classification === MoveClassification.Excellent &&
      this.settings.explainExcellent
    ) {
      return true;
    }

    // Explain opening moves if setting enabled
    if (
      classification === MoveClassification.Opening &&
      this.settings.explainOpening
    ) {
      return true;
    }

    // Explain moves with significant evaluation changes
    if (Math.abs(evalChange) >= this.settings.minEvalChange) {
      return true;
    }

    return false;
  }

  /**
   * Generates explanation for a single move
   */
  async explainMove(request: ExplanationRequest): Promise<MoveExplanation> {
    const prompt = this.buildPrompt(request);

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a chess expert explaining moves based on Stockfish analysis. Provide concise, educational explanations focused on why moves are good or bad according to the engine evaluation.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `OpenAI API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new Error("No explanation generated");
    }

    return this.parseResponse(content, request);
  }

  /**
   * Generates explanations for multiple moves in batches
   */
  async batchExplainMoves(
    requests: ExplanationRequest[],
    onProgress?: (progress: BatchExplanationProgress) => void,
    concurrency = 3
  ): Promise<MoveExplanation[]> {
    const results: MoveExplanation[] = [];
    const errors: string[] = [];
    let completed = 0;

    // Process requests in batches
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);

      const batchPromises = batch.map(async (request) => {
        try {
          const explanation = await this.explainMove(request);
          return explanation;
        } catch (error) {
          const errorMsg = `Move ${request.moveNumber}: ${error instanceof Error ? error.message : "Unknown error"}`;
          errors.push(errorMsg);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);

      for (const result of batchResults) {
        if (result) {
          results.push(result);
        }
        completed++;

        onProgress?.({
          total: requests.length,
          completed,
          current: result ? `Move ${result.moveNumber}` : undefined,
          errors,
        });
      }

      // Rate limiting: small delay between batches
      if (i + concurrency < requests.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  private buildPrompt(request: ExplanationRequest): string {
    const evalChange =
      request.currentWinPercentage - request.previousWinPercentage;
    const evalChangeForPlayer = request.isWhiteMove ? evalChange : -evalChange;

    const bestMove = request.positionEval.bestMove;
    const bestEval = request.positionEval.lines[0];
    const playedMove = request.uciMove;

    return `Position: ${request.fen}
Move played: ${playedMove} (classified as ${request.classification})
${request.opening ? `Opening: ${request.opening}` : ""}

Stockfish Analysis:
- Best move: ${bestMove || "N/A"}
- Best line evaluation: ${this.formatEvaluation(bestEval)}
- Win probability changed by ${evalChangeForPlayer.toFixed(1)}% for ${request.isWhiteMove ? "White" : "Black"}

Explain in 1-2 sentences (max ${this.settings.maxLength} chars) why this move is ${request.classification}. Focus on:
${this.getClassificationGuidance(request.classification)}

Format: {"explanation": "...", "themes": ["theme1", "theme2"], "reason": "why it's ${request.classification}"}`;
  }

  private formatEvaluation(line: { mate?: number; cp?: number }): string {
    if (line.mate !== undefined) {
      return `Mate in ${Math.abs(line.mate)}`;
    }
    if (line.cp !== undefined) {
      const pawns = (line.cp / 100).toFixed(1);
      return `${line.cp > 0 ? "+" : ""}${pawns}`;
    }
    return "Unknown";
  }

  private getClassificationGuidance(
    classification: MoveClassification
  ): string {
    switch (classification) {
      case MoveClassification.Blunder:
        return "- What tactical or positional mistake was made\n- What the better alternative was";
      case MoveClassification.Mistake:
        return "- The inaccuracy in the move\n- How it worsens the position";
      case MoveClassification.Inaccuracy:
        return "- The slight imprecision\n- What would have been more accurate";
      case MoveClassification.Perfect:
      case MoveClassification.Splendid:
        return "- The brilliant tactical or positional concept\n- Why other moves were inadequate";
      case MoveClassification.Best:
        return "- Why this is the engine's top choice\n- The key idea behind the move";
      case MoveClassification.Excellent:
        return "- The good aspects of this move\n- How it improves the position";
      default:
        return "- The key aspects of this move\n- Its effect on the position";
    }
  }

  private parseResponse(
    content: string,
    request: ExplanationRequest
  ): MoveExplanation {
    try {
      const parsed = JSON.parse(content);
      return {
        move: this.uciToAlgebraic(request.uciMove, request.fen), // TODO: Implement conversion
        uciMove: request.uciMove,
        moveNumber: request.moveNumber,
        explanation: parsed.explanation.slice(0, this.settings.maxLength),
        themes: parsed.themes || [],
        classificationReason: parsed.reason || "",
        generatedAt: new Date().toISOString(),
        version: "1.0",
      };
    } catch {
      // Fallback if JSON parsing fails
      return {
        move: this.uciToAlgebraic(request.uciMove, request.fen),
        uciMove: request.uciMove,
        moveNumber: request.moveNumber,
        explanation: content.slice(0, this.settings.maxLength),
        themes: [],
        classificationReason: `Move classified as ${request.classification}`,
        generatedAt: new Date().toISOString(),
        version: "1.0",
      };
    }
  }

  private uciToAlgebraic(uciMove: string, fen: string): string {
    try {
      const chess = new Chess(fen);
      const move = chess.move({
        from: uciMove.slice(0, 2),
        to: uciMove.slice(2, 4),
        promotion: uciMove.length === 5 ? uciMove[4] : undefined,
      });
      return move ? move.san : uciMove;
    } catch {
      // Fallback to UCI notation if conversion fails
      return uciMove;
    }
  }
}
