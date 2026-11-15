import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';

import '../core/api_client.dart';

/// Both participants explicitly enter this screen before capture starts.
class MasterCallScreen extends StatefulWidget {
  final String name;
  final String? masterId;
  final Map<String, dynamic>? incoming;
  const MasterCallScreen(
      {super.key, required this.name, this.masterId, this.incoming})
      : assert((masterId == null) != (incoming == null));
  @override
  State<MasterCallScreen> createState() => _MasterCallState();
}

class _MasterCallState extends State<MasterCallScreen> {
  final api = ApiClient.instance;
  final local = RTCVideoRenderer(), remote = RTCVideoRenderer();
  RTCPeerConnection? pc;
  MediaStream? media;
  Timer? timer;
  String? id;
  String status = 'Подключение…';
  bool closed = false, polling = false, answered = false, ready = false;
  bool mic = true, camera = true;
  DateTime? started;
  late final Future<void> setup;

  @override
  void initState() {
    super.initState();
    id = widget.incoming?['id']?.toString();
    setup = start();
  }

  void update(String value) {
    if (mounted && !closed) setState(() => status = value);
  }

  Future<String> description(RTCSessionDescription desc) async {
    final complete = Completer<void>();
    pc!.onIceGatheringState = (state) {
      if (state == RTCIceGatheringState.RTCIceGatheringStateComplete &&
          !complete.isCompleted) {
        complete.complete();
      }
    };
    await pc!.setLocalDescription(desc);
    await complete.future.timeout(const Duration(seconds: 8), onTimeout: () {});
    final sdp = (await pc!.getLocalDescription())?.sdp;
    if (sdp == null || !sdp.contains('a=candidate:')) {
      throw StateError('Нет сетевого маршрута для звонка');
    }
    return sdp;
  }

  Future<void> start() async {
    try {
      await local.initialize();
      await remote.initialize();
      if (closed) return;
      final config = await api.get('/api/video-calls?ice=1');
      if (closed) return;
      if (config is! Map || config['iceServers'] == null) {
        throw StateError('Некорректная конфигурация звонка');
      }
      media = await navigator.mediaDevices.getUserMedia({
        'audio': true,
        'video': {'facingMode': 'user'}
      });
      if (closed) return;
      local.srcObject = media;
      pc = await createPeerConnection(
          {'iceServers': config['iceServers'], 'sdpSemantics': 'unified-plan'});
      if (closed) return;
      pc!.onTrack = (event) {
        if (!closed && event.streams.isNotEmpty) {
          remote.srcObject = event.streams.first;
        }
      };
      pc!.onConnectionState = (state) {
        if (closed) return;
        if (state == RTCPeerConnectionState.RTCPeerConnectionStateConnected) {
          update('На связи');
        }
        if (state == RTCPeerConnectionState.RTCPeerConnectionStateFailed) {
          unawaited(finish('Соединение прервано'));
        }
      };
      for (final track in media!.getTracks()) {
        await pc!.addTrack(track, media!);
      }
      if (closed) return;
      if (mounted) setState(() => ready = true);
      if (widget.incoming != null) {
        final offerSdp = widget.incoming!['offer']?.toString();
        if (offerSdp == null || offerSdp.isEmpty) {
          throw StateError('Некорректные данные входящего звонка');
        }
        await pc!.setRemoteDescription(RTCSessionDescription(offerSdp, 'offer'));
        final answer = await description(await pc!.createAnswer());
        if (closed) return;
        await api.post('/api/video-calls',
            body: {'action': 'answer', 'id': id, 'answer': answer});
        answered = true;
        update('Соединяем…');
      } else {
        final offer = await description(await pc!.createOffer());
        if (closed) return;
        final r = await api.post('/api/video-calls', body: {
          'action': 'dial',
          'masterId': widget.masterId,
          'offer': offer
        });
        if (r is! Map || r['id'] == null) {
          throw StateError('Сервер не вернул ID звонка');
        }
        id = r['id'].toString();
        if (closed) return;
        update('Ожидаем ответа');
      }
      if (closed) return;
      started = DateTime.now();
      timer = Timer.periodic(const Duration(seconds: 2), (_) => poll());
    } catch (e) {
      if (!closed) {
        await finish(e is ApiException
            ? e.message
            : 'Не удалось начать звонок. Проверьте сеть и доступ к камере и микрофону.');
      }
    }
  }

  Future<void> poll() async {
    if (polling || closed) return;
    polling = true;
    try {
      final res = await api.get('/api/video-calls');
      if (closed) return;
      if (res is! Map) return;
      final call = res['call'];
      if (call == null) {
        await finish('Звонок завершён');
        return;
      }
      if (call is! Map) return;
      if (call['id']?.toString() != id) {
        await finish('Звонок завершён');
        return;
      }
      final answer = call['answer']?.toString();
      if (!answered && answer != null && answer.isNotEmpty) {
        final peer = pc;
        if (peer == null) return;
        await peer.setRemoteDescription(RTCSessionDescription(answer, 'answer'));
        answered = true;
        if (status != 'На связи') update('Соединяем…');
      }
      if (status != 'На связи' &&
          started != null &&
          DateTime.now().difference(started!).inSeconds > 90) {
        await finish('Не удалось соединиться');
      }
    } catch (_) {
      if (!closed) await finish('Потеряна связь с сервером');
    } finally {
      polling = false;
    }
  }

  Future<void> hangup() async {
    final callId = id;
    id = null;
    if (callId != null) {
      try {
        await api
            .post('/api/video-calls', body: {'action': 'end', 'id': callId});
      } catch (_) {}
    }
  }

  Future<void> stopMedia() async {
    final stream = media;
    media = null;
    if (stream != null) {
      for (final t in stream.getTracks()) {
        try {
          await t.stop();
        } catch (_) {}
      }
      try {
        await stream.dispose();
      } catch (_) {}
    }
    final peer = pc;
    pc = null;
    try {
      await peer?.close();
    } catch (_) {}
    try {
      await peer?.dispose();
    } catch (_) {}
  }

  Future<void> finish(String message) async {
    if (closed) return;
    closed = true;
    timer?.cancel();
    if (mounted) {
      setState(() {
        status = message;
        ready = false;
      });
    }
    await Future.wait([stopMedia(), hangup()]);
  }

  @override
  void dispose() {
    closed = true;
    timer?.cancel();
    unawaited(hangup());
    unawaited(setup.whenComplete(() async {
      await stopMedia();
      await hangup();
      try {
        await local.dispose();
      } catch (_) {}
      try {
        await remote.dispose();
      } catch (_) {}
    }));
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text(widget.name)),
        body: Column(children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Text(
              status,
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          Expanded(
              child: ready
                  ? Stack(children: [
                      Positioned.fill(child: RTCVideoView(remote)),
                      Positioned(
                          right: 12,
                          top: 12,
                          width: 100,
                          height: 140,
                          child: RTCVideoView(local, mirror: true)),
                    ])
                  : const SizedBox()),
          SafeArea(
              child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                IconButton(
                    tooltip: 'Микрофон',
                    icon: Icon(mic ? Icons.mic : Icons.mic_off),
                    onPressed: !ready || closed
                        ? null
                        : () => setState(() {
                              mic = !mic;
                              for (final t
                                  in media?.getAudioTracks() ?? const []) {
                                t.enabled = mic;
                              }
                            })),
                IconButton(
                    tooltip: 'Камера',
                    icon: Icon(camera ? Icons.videocam : Icons.videocam_off),
                    onPressed: !ready || closed
                        ? null
                        : () => setState(() {
                              camera = !camera;
                              for (final t
                                  in media?.getVideoTracks() ?? const []) {
                                t.enabled = camera;
                              }
                            })),
                IconButton(
                    tooltip: 'Завершить',
                    color: Colors.red,
                    icon: const Icon(Icons.call_end),
                    onPressed: () {
                      if (Navigator.canPop(context)) {
                        Navigator.pop(context);
                      } else {
                        unawaited(finish('Звонок завершён'));
                      }
                    }),
              ])),
        ]),
      );
}
