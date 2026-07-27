import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fixly_app/theme/app_theme.dart';

class MasterCallScreen extends StatefulWidget {
  final String masterName;
  final String masterCategory;

  const MasterCallScreen({
    super.key,
    this.masterName = 'Алексей Смирнов',
    this.masterCategory = 'Главный сантехник ОСИ',
  });

  @override
  State<MasterCallScreen> createState() => _MasterCallScreenState();
}

class _MasterCallScreenState extends State<MasterCallScreen> {
  bool _isMuted = false;
  bool _isSpeaker = true;
  bool _isVideoOn = false;

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);

    return Scaffold(
      backgroundColor: const Color(0xFF121212), // Тёмный фон интерфейса звонка
      body: SafeArea(
        child: Column(
          children: [
            // Верхняя панель
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppDimens.spaceMd,
                vertical: AppDimens.spaceSm,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back, color: Colors.white),
                    onPressed: () => Navigator.pop(context),
                  ),
                  Row(
                    children: [
                      Icon(LucideIcons.shieldCheck, size: 16, color: c.success),
                      const SizedBox(width: 6),
                      const Text(
                        'Защищённый звонок',
                        style: TextStyle(color: Colors.white70, fontSize: 13),
                      ),
                    ],
                  ),
                  const SizedBox(width: 48), // Заглушка для выравнивания
                ],
              ),
            ),
            const Spacer(),

            // Аватар и статус
            CircleAvatar(
              radius: 54,
              backgroundColor: c.primary.withOpacity(0.2),
              child: Icon(LucideIcons.user, size: 54, color: c.primary),
            ),
            const SizedBox(height: AppDimens.spaceMd),
            Text(
              widget.masterName,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 22,
                fontWeight: AppTypography.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              widget.masterCategory,
              style: TextStyle(color: c.textTertiary, fontSize: 14),
            ),
            const SizedBox(height: AppDimens.spaceSm),
            const Text(
              '02:45', // Таймер звонка
              style: TextStyle(color: Colors.white38, fontSize: 14),
            ),

            const Spacer(),

            // Элементы управления
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppDimens.spaceLg),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _buildControlButton(
                    icon: _isMuted ? LucideIcons.micOff : LucideIcons.mic,
                    label: _isMuted ? 'Микрофон выкл' : 'Микрофон',
                    isActive: _isMuted,
                    onTap: () => setState(() => _isMuted = !_isMuted),
                  ),
                  _buildControlButton(
                    icon: _isVideoOn ? LucideIcons.video : LucideIcons.videoOff,
                    label: _isVideoOn ? 'Видео вкл' : 'Видео',
                    isActive: _isVideoOn,
                    onTap: () => setState(() => _isVideoOn = !_isVideoOn),
                  ),
                  _buildControlButton(
                    icon: _isSpeaker ? LucideIcons.volume2 : LucideIcons.volumeX,
                    label: 'Динамик',
                    isActive: _isSpeaker,
                    onTap: () => setState(() => _isSpeaker = !_isSpeaker),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppDimens.spaceLg),

            // Кнопка сброса
            Padding(
              padding: const EdgeInsets.only(bottom: AppDimens.spaceXl),
              child: FloatingActionButton.large(
                heroTag: 'end_call_btn',
                onPressed: () => Navigator.pop(context),
                backgroundColor: c.danger,
                elevation: 4,
                child: const Icon(LucideIcons.phoneOff, color: Colors.white, size: 32),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildControlButton({
    required IconData icon,
    required String label,
    required bool isActive,
    required VoidCallback onTap,
  }) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(32),
          child: Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isActive ? Colors.white : Colors.white10,
            ),
            child: Icon(
              icon,
              color: isActive ? Colors.black : Colors.white,
              size: 24,
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: const TextStyle(color: Colors.white70, fontSize: 12),
        ),
      ],
    );
  }
}