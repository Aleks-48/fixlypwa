import 'api_client.dart';

// Онбординг председателя (onboarding-unified.md §0, срез R2/REQ-137/143): ОСИ → дом →
// квартиры → жители. Все эндпоинты требуют роль CHAIRMAN активной ОСИ (chairmanContext на
// сервере), КРОМЕ createOsi — тот доступен любому вошедшему (создатель сам становится
// CHAIRMAN, Q-051).

class Building {
  final String id;
  final String address;
  final int? apartmentsCount;
  Building({required this.id, required this.address, this.apartmentsCount});

  factory Building.fromJson(Map<String, dynamic> json) => Building(
        id: json['id'] as String,
        address: json['address'] as String,
        apartmentsCount: (json['apartmentsCount'] as num?)?.toInt(),
      );
}

class Occupant {
  final String id;
  final String fullName;
  final String? phone;
  final String? email;

  Occupant({
    required this.id,
    required this.fullName,
    this.phone,
    this.email,
  });

  factory Occupant.fromJson(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>?;
    return Occupant(
      id: json['id'] as String,
      fullName: json['fullName'] as String,
      phone: json['phone'] as String?,
      email: user?['email'] as String?,
    );
  }
}

class Apartment {
  final String id;
  final String number;
  final double? area;
  final int? rooms;
  final List<Occupant> occupants;

  Apartment({
    required this.id,
    required this.number,
    this.area,
    this.rooms,
    this.occupants = const [],
  });

  factory Apartment.fromJson(Map<String, dynamic> json) {
    final rawArea = json['area'];
    double? parsedArea;
    if (rawArea is num) {
      parsedArea = rawArea.toDouble();
    } else if (rawArea is String) {
      parsedArea = double.tryParse(rawArea);
    }

    final rawRooms = json['rooms'];
    int? parsedRooms;
    if (rawRooms is num) {
      parsedRooms = rawRooms.toInt();
    } else if (rawRooms is String) {
      parsedRooms = int.tryParse(rawRooms);
    }

    return Apartment(
      id: json['id'] as String,
      number: json['number'] as String,
      area: parsedArea,
      rooms: parsedRooms,
      occupants: ((json['occupants'] as List?) ?? const [])
          .cast<Map<String, dynamic>>()
          .map(Occupant.fromJson)
          .toList(),
    );
  }
}

// Заявка на подключение к ОСИ (REQ-151..154, docs/specs/osi-join-request.md — портировано с
// веба, web/src/lib/onboarding/joinRequest.ts). Osi вне RLS — поиск доступен любому вошедшему.

class OsiSearchResult {
  final String id;
  final String name;
  final String? address;
  OsiSearchResult({required this.id, required this.name, this.address});

  factory OsiSearchResult.fromJson(Map<String, dynamic> json) => OsiSearchResult(
        id: json['id'] as String,
        name: json['name'] as String,
        address: json['address'] as String?,
      );
}

// Моя заявка (GET /api/osi/join-request) — osi вложена сервером для отображения статуса.
class MyJoinRequest {
  final String id;
  final String? note;
  final String osiName;
  final String? osiAddress;
  MyJoinRequest({required this.id, this.note, required this.osiName, this.osiAddress});

  factory MyJoinRequest.fromJson(Map<String, dynamic> json) {
    final osi = json['osi'] as Map<String, dynamic>;
    return MyJoinRequest(
      id: json['id'] as String,
      note: json['note'] as String?,
      osiName: osi['name'] as String,
      osiAddress: osi['address'] as String?,
    );
  }
}

// Заявка со стороны председателя (GET /api/osi/join-requests) — контакт заявителя (телефон/
// email из User), сама привязку к квартире не делает (REQ-153, addResident по-прежнему вручную).
class PendingJoinRequest {
  final String id;
  final String? note;
  final String? email;
  final String? phone;
  final String? fullName;
  PendingJoinRequest({required this.id, this.note, this.email, this.phone, this.fullName});

  factory PendingJoinRequest.fromJson(Map<String, dynamic> json) {
    final user = (json['user'] as Map<String, dynamic>?) ?? {};
    final occupant = user['occupant'] as Map<String, dynamic>?;
    return PendingJoinRequest(
      id: json['id'] as String,
      note: json['note'] as String?,
      email: user['email'] as String?,
      phone: user['phone'] as String?,
      fullName: occupant?['fullName'] as String? ?? user['fullName'] as String?,
    );
  }
}

class OsiRepository {
  OsiRepository._();
  static final OsiRepository instance = OsiRepository._();

  final _api = ApiClient.instance;

  // Создатель становится CHAIRMAN, новая ОСИ — активная (Q-051). Возвращает activeOsiId —
  // вызывающий обязан перечитать AuthRepository.me() после этого, чтобы обновить AuthUser.
  Future<String> createOsi({required String name, String? bin, String? address}) async {
    final data = await _api.post('/api/osi', body: {
      'name': name,
      if (bin != null && bin.isNotEmpty) 'bin': bin,
      if (address != null && address.isNotEmpty) 'address': address,
    }) as Map<String, dynamic>;
    return data['activeOsiId'] as String;
  }

  Future<Building> createBuilding({required String address, int? apartmentsCount}) async {
    final data = await _api.post('/api/buildings', body: {
      'address': address,
      if (apartmentsCount != null) 'apartmentsCount': apartmentsCount,
    }) as Map<String, dynamic>;
    return Building.fromJson(data['building'] as Map<String, dynamic>);
  }

  Future<List<Building>> listBuildings() async {
    final data = await _api.get('/api/buildings') as Map<String, dynamic>;
    return (data['buildings'] as List).cast<Map<String, dynamic>>().map(Building.fromJson).toList();
  }

  Future<List<Apartment>> listApartments(String buildingId) async {
    final data = await _api.get('/api/apartments?buildingId=$buildingId') as Map<String, dynamic>;
    return (data['apartments'] as List)
        .cast<Map<String, dynamic>>()
        .map(Apartment.fromJson)
        .toList();
  }

  Future<Apartment> createApartment({required String buildingId, required String number}) async {
    final data = await _api.post('/api/apartments', body: {
      'buildingId': buildingId,
      'number': number,
    }) as Map<String, dynamic>;
    return Apartment.fromJson(data['apartment'] as Map<String, dynamic>);
  }

  // Телефон И/ИЛИ email — минимум один (ревизия REQ-013). Если житель уже сам
  // зарегистрировался тем же контактом — сервер подхватывает существующий аккаунт (upsert),
  // не создаёт дубль.
  Future<void> addResident({
    required String apartmentId,
    required String fullName,
    String? phone,
    String? email,
  }) async {
    await _api.post('/api/residents', body: {
      'apartmentId': apartmentId,
      'fullName': fullName,
      if (phone != null && phone.isNotEmpty) 'phone': phone,
      if (email != null && email.isNotEmpty) 'email': email,
    });
  }

  // REQ-151: найти ОСИ по названию/адресу — доступно любому вошедшему, без роли/tenant.
  Future<List<OsiSearchResult>> searchOsi(String query) async {
    final data = await _api.get('/api/osi/search?q=${Uri.encodeComponent(query)}')
        as Map<String, dynamic>;
    return (data['results'] as List)
        .cast<Map<String, dynamic>>()
        .map(OsiSearchResult.fromJson)
        .toList();
  }

  // Мои активные заявки (REQ-154) — статус вместо повторного поиска, если уже отправлена.
  Future<List<MyJoinRequest>> myJoinRequests() async {
    final data = await _api.get('/api/osi/join-request') as Map<String, dynamic>;
    return (data['requests'] as List)
        .cast<Map<String, dynamic>>()
        .map(MyJoinRequest.fromJson)
        .toList();
  }

  // Возвращает id созданной/обновлённой заявки (review 2026-07-22: раньше вызывающий сам
  // генерировал фейковый id для локального состояния — «Отменить» до перезагрузки экрана
  // слало DELETE на несуществующий id и падало с 404).
  Future<String> submitJoinRequest({required String osiId, String? note}) async {
    final data = await _api.post('/api/osi/join-request', body: {
      'osiId': osiId,
      if (note != null && note.isNotEmpty) 'note': note,
    }) as Map<String, dynamic>;
    return (data['request'] as Map<String, dynamic>)['id'] as String;
  }

  Future<void> cancelJoinRequest(String id) async {
    await _api.delete('/api/osi/join-request/$id');
  }

  // REQ-153: заявки своей ОСИ — требует роль CHAIRMAN активной ОСИ (chairmanContext на сервере).
  Future<List<PendingJoinRequest>> listOsiJoinRequests() async {
    final data = await _api.get('/api/osi/join-requests') as Map<String, dynamic>;
    return (data['requests'] as List)
        .cast<Map<String, dynamic>>()
        .map(PendingJoinRequest.fromJson)
        .toList();
  }

  Future<void> resolveJoinRequest(String id) async {
    await _api.post('/api/osi/join-requests/$id/resolve');
  }
}
