declare module "supertest" {
  import express from "express";

  interface Response {
    status: number;
    body: any;
    headers: Record<string, string>;
    header: Record<string, string>;
    text: string;
  }

  interface Test {
    set(field: string, val: string): this;
    set(field: object): this;
    send(data?: string | object): this;
    query(params: string | object): this;
    auth(user: string, pass: string): this;
    expect(status: number): Promise<Response>;
    then<TResult1 = Response, TResult2 = never>(
      onfulfilled?: ((value: Response) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
    ): Promise<TResult1 | TResult2>;
  }

  function request(app: any): {
    get(url: string): Test;
    post(url: string): Test;
    put(url: string): Test;
    patch(url: string): Test;
    delete(url: string): Test;
    options(url: string): Test;
    head(url: string): Test;
    [method: string]: any;
  };


  export default request;
}
