import { CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts';

export default function HourlyChart({ points, unit, motion }) {
  return <ResponsiveContainer width="100%" height="100%" minWidth={0}>
    <LineChart data={points} margin={{top:25,right:44,bottom:10,left:44}} accessibilityLayer aria-label={`Почасовая температура в градусах ${unit === 'c' ? 'Цельсия' : 'Фаренгейта'}`}>
      <CartesianGrid vertical={false} stroke="#d9ddd3" strokeDasharray="2 5" />
      <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
      <Tooltip formatter={value => [`${value}°${unit.toUpperCase()}`, 'Температура']} labelFormatter={(_,payload) => payload?.[0]?.payload.timeLabel || ''} contentStyle={{background:'#fcfbf6',border:'1px solid #cdd5c9',borderRadius:10,fontSize:13}} />
      <Line type="monotone" dataKey="degrees" stroke="#b96d4d" strokeWidth={2.5} dot={{r:4,fill:'#fcfbf6',strokeWidth:2}} activeDot={{r:6}} isAnimationActive={motion} animationDuration={600} connectNulls={false}>
        <LabelList dataKey="degrees" position="top" offset={12} formatter={value=>`${value}°`} fill="#34483a" fontSize={14} fontWeight={600} />
      </Line>
    </LineChart>
  </ResponsiveContainer>;
}
