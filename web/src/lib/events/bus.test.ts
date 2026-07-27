import { describe, it, expect, vi } from "vitest";
import { subscribe, publish } from "./bus";

describe("events/bus — in-memory pub/sub для SSE (срез 24)", () => {
  it("подписчик получает событие, опубликованное для его userId", () => {
    const listener = vi.fn();
    subscribe("user-1", listener);

    publish("user-1", { type: "REQUEST_CREATED", notificationId: "n1", entityType: "request", entityId: "r1" });

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ type: "REQUEST_CREATED", notificationId: "n1" }),
    );
  });

  it("публикация без подписчиков не бросает (никто не слушает — событие молча теряется)", () => {
    expect(() =>
      publish("no-such-user", { type: "ANNOUNCEMENT", notificationId: "n2", entityType: null, entityId: null }),
    ).not.toThrow();
  });

  it("событие для другого userId не долетает (изоляция по получателю)", () => {
    const listenerA = vi.fn();
    const listenerB = vi.fn();
    subscribe("user-a", listenerA);
    subscribe("user-b", listenerB);

    publish("user-a", { type: "ANNOUNCEMENT", notificationId: "n3", entityType: null, entityId: null });

    expect(listenerA).toHaveBeenCalledOnce();
    expect(listenerB).not.toHaveBeenCalled();
  });

  it("unsubscribe() останавливает доставку этому слушателю", () => {
    const listener = vi.fn();
    const unsubscribe = subscribe("user-2", listener);
    unsubscribe();

    publish("user-2", { type: "ANNOUNCEMENT", notificationId: "n4", entityType: null, entityId: null });

    expect(listener).not.toHaveBeenCalled();
  });

  it("несколько подписчиков одного userId получают одно и то же событие", () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    subscribe("user-3", listener1);
    subscribe("user-3", listener2);

    publish("user-3", { type: "REQUEST_MESSAGE", notificationId: "n5", entityType: "request", entityId: "r5" });

    expect(listener1).toHaveBeenCalledOnce();
    expect(listener2).toHaveBeenCalledOnce();
  });
});
