import { CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function HourlyChart({ points, unit, motion, tooltipPortal }) {
  return <ResponsiveContainer width="100%" height="100%" minWidth={0}>
    <LineChart data={points} margin={{ top: 28, right: 0, bottom: 10, left: 0 }} accessibilityLayer aria-label={`Почасовая температура в градусах ${unit === 'c' ? 'Цельсия' : 'Фаренгейта'}`}>
      <CartesianGrid vertical={false} stroke="#d9ecff30" strokeDasharray="2 5" />
      <XAxis dataKey="time_epoch" hide scale="band" />
      <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
      <Tooltip portal={tooltipPortal} wrapperStyle={{position:'absolute',top:0,right:0,pointerEvents:'none',maxWidth:'100%'}} formatter={value => [`${value}°${unit.toUpperCase()}`, 'Температура']} labelFormatter={(_,payload) => payload?.[0]?.payload.timeLabel || ''} contentStyle={{background:'#173c5e',color:'#f7fbff',border:'1px solid #bcdcf566',borderRadius:10,fontSize:13}} itemStyle={{color:'#f7fbff'}} />
      <Line type="monotone" dataKey="degrees" stroke="#c2e5ff" strokeWidth={2.5} dot={{r:3.5,fill:'#f4faff',strokeWidth:1}} activeDot={{r:5}} isAnimationActive={motion} animationDuration={450} connectNulls={false}>
        <LabelList dataKey="degrees" position="top" offset={12} formatter={value=>`${value}°`} fill="#f4faff" fontSize={16} fontWeight={650} />
      </Line>
    </LineChart>
  </ResponsiveContainer>;
}
