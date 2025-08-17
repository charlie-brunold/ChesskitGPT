import { MoveClassification } from "./enums";
import { PositionEval } from "./eval";

export interface MoveExplanation {
  /** The move in algebraic notation (e.g., "Nf3", "O-O") */
  move: string;
  /** The move in UCI notation (e.g., "g1f3", "e1g1") */
  uciMove: string;
  /** Position index in the game */
  moveNumber: number;
  /** Brief explanation (max 150 chars) */
  explanation: string;
  /** Key tactical/positional themes identified */
  themes: string[];
  /** Why this move is classified as it is */
  classificationReason: string;
  /** Timestamp when explanation was generated */
  generatedAt: string;
  /** Version of explanation prompt used */
  version: string;
}

export interface ExplanationRequest {
  /** Position in FEN notation */
  fen: string;
  /** The move played in UCI notation */
  uciMove: string;
  /** Move number in the game */
  moveNumber: number;
  /** Stockfish evaluation of the position */
  positionEval: PositionEval;
  /** Previous position evaluation for context */
  previousPositionEval?: PositionEval;
  /** Move classification from Stockfish analysis */
  classification: MoveClassification;
  /** Opening name if known */
  opening?: string;
  /** Win percentage before the move */
  previousWinPercentage: number;
  /** Win percentage after the move */
  currentWinPercentage: number;
  /** Whether it's white's move */
  isWhiteMove: boolean;
}

export interface GameExplanations {
  /** Game ID in the database */
  gameId: number;
  /** Map of move number to explanation */
  explanations: Record<number, MoveExplanation>;
  /** When explanations were generated */
  generatedAt: string;
  /** Version of explanation service used */
  version: string;
}

export interface BatchExplanationProgress {
  /** Total moves to explain */
  total: number;
  /** Moves explained so far */
  completed: number;
  /** Current move being processed */
  current?: string;
  /** Any errors encountered */
  errors: string[];
}

export interface ExplanationSettings {
  /** Maximum explanation length in characters */
  maxLength: number;
  /** Whether to explain excellent moves */
  explainExcellent: boolean;
  /** Whether to explain opening moves */
  explainOpening: boolean;
  /** Minimum evaluation change to explain */
  minEvalChange: number;
}
