import { Icon } from "@iconify/react";
import { LoadingButton } from "@mui/lab";
import { Typography, Chip } from "@mui/material";
import { useGameExplanations } from "@/hooks/useGameExplanations";
import { useExplanations } from "@/hooks/useExplanations";

export default function ExplainButton() {
  const {
    isGenerating,
    progress,
    error,
    shouldAutoGenerate,
    generateExplanations,
  } = useGameExplanations();
  const { hasExplanations, explanationCount } = useExplanations();

  const handleExplain = () => {
    generateExplanations();
  };

  // Don't show if we can't generate explanations
  if (!shouldAutoGenerate && !hasExplanations) {
    return null;
  }

  return (
    <>
      <LoadingButton
        variant={hasExplanations ? "outlined" : "contained"}
        size="small"
        startIcon={<Icon icon="mdi:brain" height={12} />}
        onClick={handleExplain}
        loading={isGenerating}
        disabled={isGenerating}
        color={error ? "error" : "primary"}
      >
        <Typography fontSize="0.9em" fontWeight="500" lineHeight="1.4em">
          {hasExplanations ? "Explain Again" : "Explain Moves"}
        </Typography>
      </LoadingButton>

      {hasExplanations && (
        <Chip
          label={`${explanationCount} explanations`}
          size="small"
          variant="outlined"
          sx={{ ml: 1 }}
        />
      )}

      {progress && (
        <Typography variant="caption" sx={{ ml: 1 }}>
          {progress.completed}/{progress.total}
          {progress.current && ` (${progress.current})`}
        </Typography>
      )}

      {error && (
        <Typography variant="caption" color="error" sx={{ ml: 1 }}>
          {error}
        </Typography>
      )}
    </>
  );
}
