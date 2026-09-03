import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'

import likeEmoji from '@/assets/images/emojis/like.svg'
import heartEmoji from '@/assets/images/emojis/heart.svg'
import laughEmoji from '@/assets/images/emojis/laugh.svg'
import wowEmoji from '@/assets/images/emojis/wow.svg'
import sadEmoji from '@/assets/images/emojis/sad.svg'
import angryEmoji from '@/assets/images/emojis/angry.svg'
import clapEmoji from '@/assets/images/emojis/clap.svg'
import celebrateEmoji from '@/assets/images/emojis/celebrate.svg'

export const WRITE_POLICY_OPTIONS_KEY = APP_CONSTANT_KEY.CHAT.GROUP_CHANNEL.WRITE_POLICY_CHOICES
export const CHANNEL_STATE_OPTIONS_KEY = APP_CONSTANT_KEY.CHAT.GROUP_CHANNEL.STATE_CHOICES

export const EMOJI_MAP: Record<string, string> = {
  like: likeEmoji,
  heart: heartEmoji,
  laugh: laughEmoji,
  wow: wowEmoji,
  sad: sadEmoji,
  angry: angryEmoji,
  clap: clapEmoji,
  celebrate: celebrateEmoji,
}

export interface ReactionType {
  key: string
  emoji: string
  url: string
  label: string
  bgActive?: string
}

export const REACTION_TYPES: ReactionType[] = [
  {
    key: 'like',
    emoji: '👍',
    url: likeEmoji,
    label: 'Thích',
    bgActive: 'bg-data-blue-disabled border-data-blue-focus/30 text-data-blue-hover',
  },
  {
    key: 'heart',
    emoji: '❤️',
    url: heartEmoji,
    label: 'Yêu thích',
    bgActive:
      'bg-action-primary-red-activated border-action-primary-red-focus/30 text-action-primary-red-default',
  },
  {
    key: 'laugh',
    emoji: '😂',
    url: laughEmoji,
    label: 'Cười',
    bgActive: 'bg-amber-55 border-amber-200 text-amber-700',
  },
  {
    key: 'wow',
    emoji: '😮',
    url: wowEmoji,
    label: 'Ngạc nhiên',
    bgActive: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  },
  {
    key: 'sad',
    emoji: '😢',
    url: sadEmoji,
    label: 'Buồn',
    bgActive: 'bg-blue-100 border-blue-200 text-blue-800',
  },
  {
    key: 'angry',
    emoji: '😡',
    url: angryEmoji,
    label: 'Phẫn nộ',
    bgActive: 'bg-orange-100 border-orange-200 text-orange-700',
  },
  {
    key: 'clap',
    emoji: '👏',
    url: clapEmoji,
    label: 'Vỗ tay',
    bgActive: 'bg-emerald-100 border-emerald-200 text-emerald-800',
  },
  {
    key: 'celebrate',
    emoji: '🎉',
    url: celebrateEmoji,
    label: 'Chúc mừng',
    bgActive: 'bg-pink-100 border-pink-200 text-pink-700',
  },
]
