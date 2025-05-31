import { Handle, Position } from "reactflow";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TaskNodeProps {
  data: {
    label: string;
    status: string;
    description?: string;
  };
}

export default function TaskNode({ data }: TaskNodeProps) {
  return (
    <Card className="p-4 min-w-[200px]">
      <Handle type="target" position={Position.Left} />
      <div className="space-y-2">
        <div className="font-medium">{data.label}</div>
        {data.description && (
          <div className="text-sm text-muted-foreground">{data.description}</div>
        )}
        <Badge variant="outline">{data.status}</Badge>
      </div>
      <Handle type="source" position={Position.Right} />
    </Card>
  );
} 