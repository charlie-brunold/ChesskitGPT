import { Skeleton, Stack, Typography, Collapse, Box } from "@mui/material";
import { useAtomValue } from "jotai";
import { boardAtom, currentPositionAtom } from "../../states";
import { useMemo } from "react";
import { moveLineUciToSan } from "@/lib/chess";
import { MoveClassification } from "@/types/enums";
import Image from "next/image";
import PrettyMoveSan from "@/components/prettyMoveSan";
import { useExplanations } from "@/hooks/useExplanations";

export default function MoveInfo() {
  const position = useAtomValue(currentPositionAtom);
  const board = useAtomValue(boardAtom);
  const { currentMoveExplanation } = useExplanations();

  const bestMove = position?.lastEval?.bestMove;

  const bestMoveSan = useMemo(() => {
    if (!bestMove) return undefined;

    const lastPosition = board.history({ verbose: true }).at(-1)?.before;
    if (!lastPosition) return undefined;

    return moveLineUciToSan(lastPosition)(bestMove);
  }, [bestMove, board]);

  if (board.history().length === 0) return null;

  if (!bestMoveSan) {
    return (
      <Stack direction="row" alignItems="center" columnGap={5} marginTop={0.8}>
        <Skeleton
          variant="rounded"
          animation="wave"
          width={"12em"}
          sx={{ color: "transparent", maxWidth: "7vw" }}
        >
          <Typography align="center" fontSize="0.9rem">
            placeholder
          </Typography>
        </Skeleton>
      </Stack>
    );
  }

  const moveClassification = position.eval?.moveClassification;

  const showBestMoveLabel =
    moveClassification !== MoveClassification.Best &&
    moveClassification !== MoveClassification.Opening &&
    moveClassification !== MoveClassification.Forced &&
    moveClassification !== MoveClassification.Splendid &&
    moveClassification !== MoveClassification.Perfect;

  return (
    <Stack spacing={1}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="center"
        columnGap={4}
        marginTop={0.5}
        flexWrap="wrap"
      >
        {moveClassification && (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Image
              src={`/icons/${moveClassification}.png`}
              alt="move-icon"
              width={16}
              height={16}
              style={{
                maxWidth: "3.5vw",
                maxHeight: "3.5vw",
              }}
            />

            <PrettyMoveSan
              typographyProps={{
                fontSize: "0.9rem",
              }}
              san={position.lastMove?.san ?? ""}
              color={position.lastMove?.color ?? "w"}
              additionalText={
                " is " + moveClassificationLabels[moveClassification]
              }
            />
          </Stack>
        )}

        {showBestMoveLabel && (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Image
              src={"/icons/best.png"}
              alt="move-icon"
              width={16}
              height={16}
              style={{
                maxWidth: "3.5vw",
                maxHeight: "3.5vw",
              }}
            />
            <PrettyMoveSan
              typographyProps={{
                fontSize: "0.9rem",
              }}
              san={bestMoveSan}
              color={position.lastMove?.color ?? "w"}
              additionalText=" was the best move"
            />
          </Stack>
        )}
      </Stack>

      {/* Move Explanation Display */}
      <Collapse in={!!currentMoveExplanation}>
        {currentMoveExplanation && (
          <Box
            sx={(theme) => ({
              backgroundColor:
                theme.palette.mode === "dark" ? "#2a2a2a" : "#f5f5f5",
              border: `1px solid ${
                theme.palette.mode === "dark" ? "#444" : "#ddd"
              }`,
              borderRadius: 1,
              padding: 1.5,
              marginTop: 1,
            })}
          >
            <Typography
              variant="body2"
              sx={{
                fontSize: "0.85rem",
                lineHeight: 1.4,
                fontStyle: "italic",
              }}
            >
              {currentMoveExplanation.explanation}
            </Typography>

            {currentMoveExplanation.themes.length > 0 && (
              <Box sx={{ marginTop: 1 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: "0.75rem",
                    opacity: 0.7,
                  }}
                >
                  Themes: {currentMoveExplanation.themes.join(", ")}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Collapse>
    </Stack>
  );
}

const moveClassificationLabels: Record<MoveClassification, string> = {
  [MoveClassification.Opening]: "an opening move",
  [MoveClassification.Forced]: "forced",
  [MoveClassification.Splendid]: "splendid !!",
  [MoveClassification.Perfect]: "the only good move !",
  [MoveClassification.Best]: "the best move",
  [MoveClassification.Excellent]: "excellent",
  [MoveClassification.Okay]: "an okay move",
  [MoveClassification.Inaccuracy]: "an inaccuracy",
  [MoveClassification.Mistake]: "a mistake",
  [MoveClassification.Blunder]: "a blunder",
};
