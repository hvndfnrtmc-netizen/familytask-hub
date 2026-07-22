export default function MemberAvatar({ member, size = 'md', onClick, selected }) {
  const sizes = { sm: 'w-8 h-8 text-lg', md: 'w-10 h-10 text-xl', lg: 'w-14 h-14 text-3xl' };
  return (
    <button
      onClick={onClick}
      title={member?.name}
      className={`${sizes[size]} rounded-full flex items-center justify-center
        transition-all border-2
        ${selected ? 'border-primary ring-2 ring-primary/40 scale-110' : 'border-transparent hover:border-primary/50'}
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
        bg-white shadow`}
    >
      {member?.avatar}
    </button>
  );
}
