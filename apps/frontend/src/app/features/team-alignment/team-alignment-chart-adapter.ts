import { TeamAlignmentResult } from '../../model/team-alignment-result';
import { DoughnutChartConfig } from '../../ui/doughnut/doughnut.component';
import { lastSegments } from '../../utils/segments';

export function toAlignmentChartConfigs(
  result: TeamAlignmentResult,
  colors: string[]
): DoughnutChartConfig[] {
  const chartConfigs: DoughnutChartConfig[] = [];

  const moduleNames = Object.keys(result.modules);
  const teams = result.teams;

  for (const moduleName of moduleNames) {
    const module = result.modules[moduleName];

    const label = lastSegments(moduleName, 3);

    const data = teams.map((t) => module.changes[t]);
    const sum = data.reduce((acc, curr) => acc + (curr || 0), 0);

    chartConfigs.push({
      type: 'doughnut',
      data: {
        labels: teams,
        datasets: [
          {
            data,
            borderWidth: 1,
            backgroundColor: colors,
          },
        ],
      },
      options: {
        responsive: false,
        plugins: {
          legend: {
            display: false,
          },
          title: {
            display: true,
            text: label,
            font: {
              size: 16,
            },
          },
          tooltip: {
            callbacks: {
              title: () => moduleName,
              label: function (context) {
                let label = ' ' + context.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.raw !== null) {
                  const changed = context.raw as number;
                  label += changed + ' lines changed, ';
                  label += ((changed / sum) * 100).toFixed(2) + '%\n';
                }
                return label;
              },
            },
          },
        },
      },
    });
  }
  return chartConfigs;
}
