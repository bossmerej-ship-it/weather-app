import { CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts';

export default function HourlyChart({ points, unit, motion }) {
  return <ResponsiveContainer width="100%" height="100%" minWidth={0}>
    <LineChart data={points} margin={{top:25,right:44,bottom:10,left:44}} accessibilityLayer aria-label={`Почасовая температура в градусах ${unit === 'c' ? 'Цельсия' : 'Фаренгейта'}`}>
      <CartesianGrid vertical={false} stroke="#d9ecff30" strokeDasharray="2 5" />
      <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
      <Tooltip formatter={value => [`${value}°${unit.toUpperCase()}`, 'Температура']} labelFormatter={(_,payload) => payload?.[0]?.payload.timeLabel || ''} contentStyle={{background:'#173c5e',color:'#f7fbff',border:'1px solid #bcdcf566',borderRadius:10,fontSize:13}} itemStyle={{color:'#f7fbff'}} />
      <Line type="monotone" dataKey="degrees" stroke="#c2e5ff" strokeWidth={2} dot={{r:3.5,fill:'#f4faff',strokeWidth:1}} activeDot={{r:5}} isAnimationActive={motion} animationDuration={450} connectNulls={false}>
        <LabelList dataKey="degrees" position="top" offset={12} formatter={value=>`${value}°`} fill="#f4faff" fontSize={14} fontWeight={600} />
      </Line>
    </LineChart>
  </ResponsiveContainer>;
}
