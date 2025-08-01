import { GitHubIntegration } from "@/components/documentos/github/GitHubIntegration";

interface GitHubTabProps {
  syncFromGitHubMutation: any;
  syncAllToGitHubMutation: any;
  repoStructures: any[];
  githubRepoFiles: any[];
  isLoadingRepo: boolean;
  selectedFolderPath: string;
  setSelectedFolderPath: (path: string) => void;
  selectedFolderFiles: any[];
  isLoadingFolderFiles: boolean;
  fetchGithubRepoStructure: () => void;
  fetchFolderFiles: (path: string) => void;
}

export function GitHubTab(props: GitHubTabProps) {
  return <GitHubIntegration {...props} />;
}